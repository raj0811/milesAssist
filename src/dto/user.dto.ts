
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
    IsEnum,
    IsOptional,
    IsIn,
    IsInt,
    Min,
    Max,
} from 'class-validator';

import { UserRole, UserStatus } from '../database/schemas/user.entity'
import { Type } from 'class-transformer';

export enum AdminRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
}

export class CreateAdminDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsEmail()
    @IsNotEmpty()
    @MaxLength(255)
    email: string;


    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(72)
    password: string;

    @IsEnum(AdminRole)
    role?: AdminRole;
}

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(255)
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(72)
    password: string;
}

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @IsEmail()
    @MaxLength(255)
    email!: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}


export class GetUsersQueryDto {
    // Pagination
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 10;

    // Search by name or email
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;

    // Filter by role
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    // Filter by status
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;

    // Sorting
    @IsOptional()
    @IsIn(['name', 'email', 'role', 'status', 'createdAt'])
    sortBy: string = 'createdAt';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder: 'ASC' | 'DESC' = 'DESC';
}

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}
