
jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseServiceMock { },
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtServiceMock { },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { newDb, DataType } from 'pg-mem';
import { randomUUID } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

import { AdminService } from './admin.service';
import { DatabaseService } from '../database/database.service';
import { Admin } from '../database/schemas/admin.entity';
import { JwtService } from '@nestjs/jwt';

describe('AdminService integration tests with pg-mem', () => {
  let service: AdminService;
  let moduleRef: TestingModule;
  let adminRepository: Repository<Admin>;
  let dataSource: DataSource;

  const testPassword = 'TestPassword123!';


  const databaseService = {
    adminRepository: undefined as unknown as Repository<Admin>,
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-for-admin-service';



    const db = newDb();

    db.public.registerFunction({
      name: 'current_database',
      returns: DataType.text,
      implementation: () => 'test',
    });

    db.public.registerFunction({
      name: 'version',
      returns: DataType.text,
      implementation: () => 'PostgreSQL 16.0',
    });

    db.public.registerFunction({
      name: 'quote_ident',
      args: [DataType.text],
      returns: DataType.text,
      implementation: (value: string) =>
        `"${value.replace(/"/g, '""')}"`,
    });

    db.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.uuid,
      implementation: () => randomUUID(),
    });

    dataSource = await db.adapters
      .createTypeormDataSource({
        type: 'postgres',
        entities: [Admin],
        synchronize: true,
      })
      .initialize();

    adminRepository = dataSource.getRepository(Admin);
    databaseService.adminRepository = adminRepository;

    moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get<AdminService>(AdminService);
  });

  beforeEach(async () => {
    await adminRepository.clear();

    jwtServiceMock.signAsync.mockReset();
    jwtServiceMock.signAsync.mockResolvedValue('test-access-token');

    await adminRepository.save(
      adminRepository.create({
        name: 'Test Admin',
        email: 'admin@example.com',
        passwordHash: testPassword || 'TestPassword123!',
        isActive: true,
      } as Partial<Admin>),
    );
  });

  afterAll(async () => {
    await moduleRef?.close();

    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    delete process.env.JWT_SECRET;
  });

  async function findTestAdmin(): Promise<Admin> {
    const admin = await adminRepository.findOne({
      where: { email: 'admin@example.com' },
    });

    if (!admin) {
      throw new Error('Test admin was not created');
    }

    return admin;
  }

  it('should log in with valid credentials', async () => {
    const admin = await findTestAdmin();

    const result = await service.login(
      'admin@example.com',
      testPassword,
    );

    expect(result.message).toBe('Login successful');
    expect(result.accessToken).toBe('test-access-token');
    expect(result.tokenType).toBe('Bearer');
    expect(result.admin.email).toBe('admin@example.com');

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
  });

  it('should reject login with an incorrect password', async () => {
    await expect(
      service.login('admin@example.com', 'WrongPassword123!'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject login for an unknown email', async () => {
    await expect(
      service.login('unknown@example.com', testPassword),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return all admins', async () => {
    const admins = await service.getAllAdmins();

    expect(admins).toHaveLength(1);
    expect(admins[0].email).toBe('admin@example.com');
  });

  it('should return an admin by ID', async () => {
    const savedAdmin = await findTestAdmin();

    const result = await service.getAdminById(savedAdmin.id);

    expect(result.id).toBe(savedAdmin.id);
    expect(result.email).toBe(savedAdmin.email);
  });

  it('should throw NotFoundException for an unknown admin ID', async () => {
    await expect(
      service.getAdminById(randomUUID()),
    ).rejects.toThrow('Admin not found');
  });

  it('should find an admin by email', async () => {
    const result = await service.getAdminByEmail('admin@example.com');

    expect(result).not.toBeNull();
    expect(result?.email).toBe('admin@example.com');
  });

  it('should return null for an unknown email', async () => {
    const result = await service.getAdminByEmail('unknown@example.com');

    expect(result).toBeNull();
  });

  it('should update an admin', async () => {
    const admin = await findTestAdmin();

    const result = await service.updateAdmin(admin.id, {
      name: 'Updated Admin',
    });

    expect(result.name).toBe('Updated Admin');

    const savedAdmin = await adminRepository.findOne({
      where: { id: admin.id },
    });

    expect(savedAdmin?.name).toBe('Updated Admin');
  });

  it('should reject updating to an email already used by another admin', async () => {
    // Create a second admin with a unique ID.
    await adminRepository.save(
      adminRepository.create({
        id: randomUUID(),
        name: 'Second Admin',
        email: 'second@example.com',
        passwordHash: testPassword || 'TestPassword123!',
        isActive: true,
      } as Partial<Admin>),
    );

    // Fetch the first admin created in beforeEach().
    const admin = await findTestAdmin();

    // Updating the first admin to the second admin's email must fail.
    await expect(
      service.updateAdmin(admin.id, {
        email: 'second@example.com',
      }),
    ).rejects.toThrow('Admin email already exists');

    // Confirm the original email remains unchanged.
    const unchangedAdmin = await adminRepository.findOne({
      where: { id: admin.id },
    });

    expect(unchangedAdmin?.email).toBe('admin@example.com');

    // Confirm both records still exist.
    expect(await adminRepository.count()).toBe(2);
  });

  it('should delete an admin', async () => {
    const admin = await findTestAdmin();

    const result = await service.deleteAdmin(admin.id);

    expect(result.message).toBe('Admin deleted successfully');

    const deletedAdmin = await adminRepository.findOne({
      where: { id: admin.id },
    });

    expect(deletedAdmin).toBeNull();
  });

  it('should reject deleting an unknown admin', async () => {
    await expect(
      service.deleteAdmin(randomUUID()),
    ).rejects.toThrow('Admin not found');
  });

  it('should validate a valid JWT', async () => {
    const admin = await findTestAdmin();

    const token = sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );

    const result = await service.validateToken(token);

    expect(result).toEqual({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });
  });

  it('should reject an invalid JWT', async () => {
    await expect(
      service.validateToken('invalid.token.value'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a valid JWT for an inactive admin', async () => {
    const admin = await findTestAdmin();

    await adminRepository.update(admin.id, { isActive: false });

    const token = sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );

    await expect(
      service.validateToken(token),
    ).rejects.toThrow('Invalid or expired token');
  });
});
