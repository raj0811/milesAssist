
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
    TransactionStatus,
    TransactionType,
} from '../database/schemas/transaction.entity';
import { BookingStatus } from '../database/schemas/booking.entity';
import { UserStatus } from '../database/schemas/user.entity';

type RevenueRange = '7d' | '1m' | '3m' | '6m' | '1y';

@Injectable()
export class DashboardService {
    constructor(
        private readonly databaseService: DatabaseService,
    ) { }

    async getOverview() {
        const [
            totalUsers,
            totalRevenue,
            activeBookings,
            pendingTransactions,
            previousUsers,
            previousRevenue,
            previousBookings,
            previousPendingTransactions,
        ] = await Promise.all([
            this.databaseService.userRepository.count(),

            this.getRevenueBetween(),

            this.databaseService.bookingRepository.count({
                where: {
                    status: BookingStatus.CONFIRMED,
                },
            }),

            this.databaseService.transactionRepository.count({
                where: {
                    status: TransactionStatus.PENDING,
                },
            }),

            this.databaseService.userRepository.count({
                // Previous month comparison is calculated below
                where: {},
            }),

            this.getRevenueForPreviousMonth(),

            this.databaseService.bookingRepository.count({
                where: {
                    status: BookingStatus.CONFIRMED,
                },
            }),

            this.databaseService.transactionRepository.count({
                where: {
                    status: TransactionStatus.PENDING,
                },
            }),
        ]);

        // Replace comparison counts with date-scoped counts.
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        currentMonthStart.setHours(0, 0, 0, 0);

        const previousMonthStart = new Date(currentMonthStart);
        previousMonthStart.setMonth(
            previousMonthStart.getMonth() - 1,
        );

        const [currentMonthUsers, previousMonthUserCount] =
            await Promise.all([
                this.databaseService.userRepository
                    .createQueryBuilder('user')
                    .where('user.createdAt >= :start', {
                        start: currentMonthStart,
                    })
                    .getCount(),

                this.databaseService.userRepository
                    .createQueryBuilder('user')
                    .where('user.createdAt >= :start', {
                        start: previousMonthStart,
                    })
                    .andWhere('user.createdAt < :end', {
                        end: currentMonthStart,
                    })
                    .getCount(),
            ]);

        const [currentRevenue, currentBookings, currentPending] =
            await Promise.all([
                this.getRevenueForPeriod(
                    currentMonthStart,
                    new Date(),
                ),

                this.databaseService.bookingRepository
                    .createQueryBuilder('booking')
                    .where('booking.status = :status', {
                        status: BookingStatus.CONFIRMED,
                    })
                    .andWhere('booking.createdAt >= :start', {
                        start: currentMonthStart,
                    })
                    .getCount(),

                this.databaseService.transactionRepository
                    .createQueryBuilder('transaction')
                    .where('transaction.status = :status', {
                        status: TransactionStatus.PENDING,
                    })
                    .andWhere('transaction.createdAt >= :start', {
                        start: currentMonthStart,
                    })
                    .getCount(),
            ]);

        const [
            previousMonthBookings,
            previousMonthPending,
        ] = await Promise.all([
            this.databaseService.bookingRepository
                .createQueryBuilder('booking')
                .where('booking.status = :status', {
                    status: BookingStatus.CONFIRMED,
                })
                .andWhere('booking.createdAt >= :start', {
                    start: previousMonthStart,
                })
                .andWhere('booking.createdAt < :end', {
                    end: currentMonthStart,
                })
                .getCount(),

            this.databaseService.transactionRepository
                .createQueryBuilder('transaction')
                .where('transaction.status = :status', {
                    status: TransactionStatus.PENDING,
                })
                .andWhere('transaction.createdAt >= :start', {
                    start: previousMonthStart,
                })
                .andWhere('transaction.createdAt < :end', {
                    end: currentMonthStart,
                })
                .getCount(),
        ]);

        return {
            totalUsers,
            totalRevenue,
            activeBookings,
            pendingTransactions,
            changes: {
                users: this.percentageChange(
                    currentMonthUsers,
                    previousMonthUserCount,
                ),
                revenue: this.percentageChange(
                    currentRevenue,
                    previousRevenue,
                ),
                bookings: this.percentageChange(
                    currentBookings,
                    previousMonthBookings,
                ),
                pendingTransactions: this.percentageChange(
                    currentPending,
                    previousMonthPending,
                ),
            },
        };
    }

    async getRevenueChart(range: RevenueRange = '6m') {
        const now = new Date();
        const start = new Date(now);

        switch (range) {
            case '7d':
                start.setDate(start.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                break;
            case '1m':
                start.setMonth(start.getMonth() - 1);
                break;
            case '3m':
                start.setMonth(start.getMonth() - 3);
                break;
            case '6m':
                start.setMonth(start.getMonth() - 5);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case '1y':
                start.setMonth(start.getMonth() - 11);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
        }

        const transactions =
            await this.databaseService.transactionRepository
                .createQueryBuilder('transaction')
                .select('transaction.createdAt', 'createdAt')
                .addSelect('transaction.amount', 'amount')
                .where('transaction.status = :status', {
                    status: TransactionStatus.SUCCESS,
                })
                .andWhere('transaction.type = :type', {
                    type: TransactionType.PAYMENT,
                })
                .andWhere('transaction.createdAt >= :start', {
                    start,
                })
                .andWhere('transaction.createdAt <= :end', {
                    end: now,
                })
                .orderBy('transaction.createdAt', 'ASC')
                .getRawMany<{
                    createdAt: Date;
                    amount: string;
                }>();

        const revenueByPeriod = new Map<string, number>();

        if (range === '7d') {
            for (
                let date = new Date(start);
                date <= now;
                date.setDate(date.getDate() + 1)
            ) {
                revenueByPeriod.set(
                    date.toISOString().slice(0, 10),
                    0,
                );
            }
        } else {
            for (
                let date = new Date(
                    start.getFullYear(),
                    start.getMonth(),
                    1,
                );
                date <= now;
                date.setMonth(date.getMonth() + 1)
            ) {
                const key = `${date.getFullYear()}-${String(
                    date.getMonth() + 1,
                ).padStart(2, '0')}`;

                revenueByPeriod.set(key, 0);
            }
        }

        for (const transaction of transactions) {
            const date = new Date(transaction.createdAt);

            const key =
                range === '7d'
                    ? date.toISOString().slice(0, 10)
                    : `${date.getFullYear()}-${String(
                        date.getMonth() + 1,
                    ).padStart(2, '0')}`;

            revenueByPeriod.set(
                key,
                (revenueByPeriod.get(key) ?? 0) +
                Number(transaction.amount),
            );
        }

        return {
            range,
            data: Array.from(
                revenueByPeriod,
                ([period, revenue]) => ({
                    period,
                    revenue: Number(revenue.toFixed(2)),
                }),
            ),
        };
    }

    async getAlerts() {
        const pendingTransactions =
            await this.databaseService.transactionRepository.count({
                where: {
                    status: TransactionStatus.PENDING,
                },
            });

        return {
            alerts: [
                ...(pendingTransactions > 0
                    ? [
                        {
                            type: 'warning',
                            title: `${pendingTransactions} transactions pending`,
                            description: 'Pending review',
                        },
                    ]
                    : []),
            ],
        };
    }

    async getRecentTransactions(limit = 5) {
        const transactions =
            await this.databaseService.transactionRepository.find({
                relations: {
                    user: true,
                },
                order: {
                    createdAt: 'DESC',
                },
                take: Math.min(Math.max(limit, 1), 50),
            });

        return transactions.map((transaction) => ({
            id: transaction.id,
            transactionReference:
                transaction.transactionReference,
            userId: transaction.userId,
            userName: transaction.user?.name ?? null,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            createdAt: transaction.createdAt,
        }));
    }

    async getSystemHealth() {
        return {
            status: 'ok',
            checkedAt: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
        };
    }


    private async getRevenueBetween(): Promise<number> {
        const result =
            await this.databaseService.transactionRepository
                .createQueryBuilder('transaction')
                .select(
                    'COALESCE(SUM(transaction.amount), 0)',
                    'total',
                )
                .where('transaction.status = :status', {
                    status: TransactionStatus.SUCCESS,
                })
                .andWhere('transaction.type = :type', {
                    type: TransactionType.PAYMENT,
                })
                .getRawOne<{ total: string }>();

        return Number(result?.total ?? 0);
    }

    private async getRevenueForPeriod(
        start: Date,
        end: Date,
    ): Promise<number> {
        const result =
            await this.databaseService.transactionRepository
                .createQueryBuilder('transaction')
                .select(
                    'COALESCE(SUM(transaction.amount), 0)',
                    'total',
                )
                .where('transaction.status = :status', {
                    status: TransactionStatus.SUCCESS,
                })
                .andWhere('transaction.type = :type', {
                    type: TransactionType.PAYMENT,
                })
                .andWhere('transaction.createdAt >= :start', {
                    start,
                })
                .andWhere('transaction.createdAt < :end', {
                    end,
                })
                .getRawOne<{ total: string }>();

        return Number(result?.total ?? 0);
    }

    private async getRevenueForPreviousMonth(): Promise<number> {
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        currentMonthStart.setHours(0, 0, 0, 0);

        const previousMonthStart = new Date(currentMonthStart);
        previousMonthStart.setMonth(
            previousMonthStart.getMonth() - 1,
        );

        return this.getRevenueForPeriod(
            previousMonthStart,
            currentMonthStart,
        );
    }

    private percentageChange(
        current: number,
        previous: number,
    ): number {
        if (previous === 0) {
            return current === 0 ? 0 : 100;
        }

        return Number(
            (((current - previous) / Math.abs(previous)) * 100).toFixed(2),
        );
    }
}
