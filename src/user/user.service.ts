import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { CreateUserDto, GetUsersQueryDto, UpdateUserDto } from 'src/dto/user.dto';
import {
    User,
    UserRole,
    UserStatus,
} from '../database/schemas/user.entity';

@Injectable()
export class UserService {
    constructor(
        private readonly databaseService: DatabaseService,
    ) { }

    async createUser(data: CreateUserDto): Promise<User> {
        const existingUser =
            await this.databaseService.userRepository.findOne({
                where: { email: data.email },
            });

        if (existingUser) {
            //"statusCode": 409,
            throw new ConflictException(
                'User with this email already exists',
            );
        }

        const user = this.databaseService.userRepository.create({
            name: data.name,
            email: data.email,
            role: data.role ?? UserRole.VIEWER,
            status: data.status ?? UserStatus.ACTIVE,
        });

        return this.databaseService.userRepository.save(user);
    }

    async getUsers(query: GetUsersQueryDto) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                role,
                status,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
            } = query;

            const queryBuilder = this.databaseService.userRepository
                .createQueryBuilder('user');

            // Search by name or email
            if (search?.trim()) {
                queryBuilder.andWhere(
                    '(user.name ILIKE :search OR user.email ILIKE :search)',
                    { search: `%${search.trim()}%` },
                );
            }

            // Filter by role
            if (role) {
                queryBuilder.andWhere('user.role = :role', { role });
            }

            // Filter by status
            if (status) {
                queryBuilder.andWhere('user.status = :status', { status });
            }

            // Safe sorting
            const allowedSortFields = [
                'name',
                'email',
                'role',
                'status',
                'createdAt',
            ];

            const safeSortBy = allowedSortFields.includes(sortBy)
                ? sortBy
                : 'createdAt';

            queryBuilder
                .orderBy(`user.${safeSortBy}`, sortOrder)
                .addOrderBy('user.id', 'ASC');

            // Pagination
            const skip = (page - 1) * limit;

            const [users, total] = await queryBuilder
                .skip(skip)
                .take(limit)
                .getManyAndCount();

            return {
                data: users,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    hasNextPage: page * limit < total,
                    hasPreviousPage: page > 1,
                },
            };
        } catch (error) {
            console.error('Failed to fetch users:', error);

            throw new InternalServerErrorException(
                'Failed to fetch users',
            );
        }
    }

    async userStats() {
        try {
            const now = new Date();

            const monthStart = new Date(
                now.getFullYear(),
                now.getMonth(),
                1,
            );

            const nextMonthStart = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                1,
            );

            const stats = await this.databaseService.userRepository
                .createQueryBuilder('user')
                .select('COUNT(*)', 'totalUsers')
                .addSelect(
                    `SUM(CASE WHEN "user"."status" = :activeStatus
                    THEN 1 ELSE 0 END)`,
                    'activeUsers',
                )
                .addSelect(
                    `SUM(CASE
                    WHEN "user"."createdAt" >= :monthStart
                    AND "user"."createdAt" < :nextMonthStart
                    THEN 1 ELSE 0
                END)`,
                    'newUsersThisMonth',
                )
                .setParameters({
                    activeStatus: 'active',
                    monthStart,
                    nextMonthStart,
                })
                .getRawOne();

            return {
                totalUsers: Number(stats?.totalUsers ?? 0),
                activeUsers: Number(stats?.activeUsers ?? 0),
                newUsersThisMonth: Number(stats?.newUsersThisMonth ?? 0),
            };
        } catch (error) {
            console.error('Error fetching user statistics:', error);

            throw new InternalServerErrorException(
                'Failed to fetch user statistics',
            );
        }
    }

    async getUserById(id: string) {
        const user = await this.databaseService.userRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const [transactions, bookings] = await Promise.all([
            this.databaseService.transactionRepository.find({
                where: { userId: id },
                order: { createdAt: 'DESC' },
                take: 5,
            }),

            this.databaseService.bookingRepository.find({
                where: { userId: id },
                order: { createdAt: 'DESC' },
                take: 5,
            }),
        ]);

        return {
            user,
            recentTransactions: transactions.map((transaction) => ({
                id: transaction.id,
                transactionReference: transaction.transactionReference,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                paymentMethod: transaction.paymentMethod,
                createdAt: transaction.createdAt,
            })),
            recentBookings: bookings.map((booking) => ({
                id: booking.id,
                bookingReference: booking.bookingReference,
                serviceName: booking.serviceName,
                status: booking.status,
                scheduledAt: booking.scheduledAt,
                amount: booking.amount,
                currency: booking.currency,
            })),
        };
    }

    async updateUser(id: string, data: UpdateUserDto): Promise<User> {
        const user = await this.databaseService.userRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (data.email && data.email !== user.email) {
            const existingUser =
                await this.databaseService.userRepository.findOne({
                    where: { email: data.email },
                });

            if (existingUser) {
                throw new ConflictException(
                    'User with this email already exists',
                );
            }
        }

        Object.assign(user, data);

        return this.databaseService.userRepository.save(user);
    }
}