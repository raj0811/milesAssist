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
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class UserService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly redisService: RedisService
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

            const safePage = Math.max(1, Number(page) || 1);
            const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));

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

            const safeSortOrder =
                String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const normalizedSearch = search?.trim() || '';

            const cacheKey = `users:list:${JSON.stringify({
                page: safePage,
                limit: safeLimit,
                search: normalizedSearch,
                role: role || '',
                status: status || '',
                sortBy: safeSortBy,
                sortOrder: safeSortOrder,
            })}`;

            try {
                const cached = await this.redisService.get<{
                    data: any[];
                    pagination: {
                        total: number;
                        page: number;
                        limit: number;
                        totalPages: number;
                        hasNextPage: boolean;
                        hasPreviousPage: boolean;
                    };
                }>(cacheKey);

                if (cached !== null) {
                    return cached;
                }
            } catch (error) {
                console.log('Redis cache read failed:', error);
            }

            const queryBuilder = this.databaseService.userRepository
                .createQueryBuilder('user');

            if (normalizedSearch) {
                queryBuilder.andWhere(
                    '(user.name ILIKE :search OR user.email ILIKE :search)',
                    { search: `%${normalizedSearch}%` },
                );
            }

            if (role) {
                queryBuilder.andWhere('user.role = :role', { role });
            }

            if (status) {
                queryBuilder.andWhere('user.status = :status', { status });
            }

            queryBuilder
                .orderBy(`user.${safeSortBy}`, safeSortOrder)
                .addOrderBy('user.id', 'ASC');

            const skip = (safePage - 1) * safeLimit;

            const [users, total] = await queryBuilder
                .skip(skip)
                .take(safeLimit)
                .getManyAndCount();

            const result = {
                data: users,
                pagination: {
                    total,
                    page: safePage,
                    limit: safeLimit,
                    totalPages: Math.ceil(total / safeLimit),
                    hasNextPage: safePage * safeLimit < total,
                    hasPreviousPage: safePage > 1,
                },
            };

            try {
                await this.redisService.set(cacheKey, result, 60);
            } catch (error) {
                console.log('Redis cache write failed:', error);
            }

            return result;
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

        try {
            await this.redisService.delPattern('users:list:*');
        } catch (error) {
            console.log('Redis user cache invalidation failed:', error);
        }

        return this.databaseService.userRepository.save(user);
    }
}