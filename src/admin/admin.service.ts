
import {
    Injectable,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
    BadRequestException,
    HttpException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Admin } from '../database/schemas/admin.entity';
import { AdminRole, CreateAdminDto } from 'src/dto/user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload, verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class AdminService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly jwtService: JwtService,
    ) { }

    async createAdmin(data: CreateAdminDto): Promise<Admin> {
        try {
            const existingAdmin =
                await this.databaseService.adminRepository.findOne({
                    where: { email: data.email },
                });

            if (existingAdmin) {
                throw new ConflictException('Admin email already exists');
            }

            const admin = this.databaseService.adminRepository.create({
                name: data.name,
                email: data.email,
                passwordHash: data.password,
                role: data.role ?? AdminRole.ADMIN,
            });

            return await this.databaseService.adminRepository.save(admin);
        } catch (e) {
            if (e instanceof HttpException) {
                throw e;
            }

            throw new BadRequestException('Failed to create admin');
        }
    }


    async login(email: string, password: string) {
        // Find admin by email and explicitly include passwordHash
        const admin = await this.databaseService.adminRepository
            .createQueryBuilder('admin')
            .addSelect('admin.passwordHash')
            .where('admin.email = :email', { email })
            .andWhere('admin.isActive = :isActive', { isActive: true })
            .getOne();

        if (!admin) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Compare the submitted password with the stored hash
        const isPasswordValid = await bcrypt.compare(
            password,
            admin.passwordHash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Generate JWT
        const payload = {
            sub: admin.id,
            email: admin.email,
            role: admin.role,
        };

        const accessToken = await this.jwtService.signAsync(payload);

        return {
            message: 'Login successful',
            accessToken,
            tokenType: 'Bearer',
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            },
        };
    }

    async getAllAdmins(): Promise<Admin[]> {
        return this.databaseService.adminRepository.find();
    }

    async getAdminById(id: string): Promise<Admin> {
        const admin = await this.databaseService.adminRepository.findOne({
            where: { id },
        });

        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        return admin;
    }

    async getAdminByEmail(email: string): Promise<Admin | null> {
        return this.databaseService.adminRepository.findOne({
            where: { email },
        });
    }

    async updateAdmin(
        id: string,
        data: Partial<Admin>,
    ): Promise<Admin> {
        const admin = await this.getAdminById(id);

        if (data.email && data.email !== admin.email) {
            const existingAdmin =
                await this.databaseService.adminRepository.findOne({
                    where: { email: data.email },
                });

            if (existingAdmin) {
                throw new ConflictException('Admin email already exists');
            }
        }

        Object.assign(admin, data);

        return this.databaseService.adminRepository.save(admin);
    }

    async deleteAdmin(id: string): Promise<{ message: string }> {
        const admin = await this.getAdminById(id);

        await this.databaseService.adminRepository.remove(admin);

        return { message: 'Admin deleted successfully' };
    }

    async validateToken(token: string) {
        try {
            const payload = verify(
                token,
                process.env.JWT_SECRET!
            ) as JwtPayload;

            if (typeof payload.sub !== 'string') {
                throw new UnauthorizedException('Invalid token');
            }

            const admin = await this.databaseService.adminRepository.findOne({
                where: {
                    id: payload.sub,
                    isActive: true,
                },
            });

            if (!admin) {
                throw new UnauthorizedException('Admin not found or inactive');
            }

            return {
                id: admin.id,
                email: admin.email,
                role: admin.role,
            };
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
