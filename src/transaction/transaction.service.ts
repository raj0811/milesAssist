
import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { CreateTransactionDto, TransactionQueryDto, UpdateTransactionStatusDto } from 'src/dto/transactions.dto';
import {
    PaymentMethod,
    TransactionStatus,
    TransactionType,
} from '../database/schemas/transaction.entity';
import { DatabaseService } from 'src/database/database.service';
import { randomUUID } from 'crypto';

@Injectable()
export class TransactionService {
    constructor(
        private readonly databaseService: DatabaseService,
    ) { }

    // 1. Paginated transactions with filters
    async getAllTransactions(query: TransactionQueryDto) {
        const {
            page = 1,
            limit = 8,
            search,
            type,
            status,
            paymentMethod,
            startDate,
            endDate,
            dateRange = '30d',
            amountRange = 'all',
            sortBy = 'createdAt',
            sortOrder = 'DESC',
        } = query;

        const qb = this.databaseService.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.user', 'user');

        if (search?.trim()) {
            const term = `%${search.trim()}%`;

            qb.andWhere(
                `(
          CAST(transaction.id AS TEXT) ILIKE :term
          OR transaction.transactionReference ILIKE :term
          OR transaction.gatewayTransactionId ILIKE :term
          OR user.name ILIKE :term
          OR user.email ILIKE :term
        )`,
                { term },
            );
        }

        if (type) {
            qb.andWhere('transaction.type = :type', { type });
        }

        if (status) {
            qb.andWhere('transaction.status = :status', { status });
        }

        if (paymentMethod) {
            qb.andWhere('transaction.paymentMethod = :paymentMethod', {
                paymentMethod,
            });
        }

        // Explicit dates take precedence over the preset.
        if (startDate) {
            qb.andWhere('transaction.createdAt >= :startDate', {
                startDate: new Date(startDate),
            });
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            qb.andWhere('transaction.createdAt <= :endDate', {
                endDate: end,
            });
        } else if (!startDate && dateRange !== 'all') {
            const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
            const from = new Date();
            from.setDate(from.getDate() - days);

            qb.andWhere('transaction.createdAt >= :from', { from });
        }

        switch (amountRange) {
            case 'under100':
                qb.andWhere('transaction.amount < :max', { max: 100 });
                break;
            case '100to1000':
                qb.andWhere('transaction.amount >= :min AND transaction.amount < :max', {
                    min: 100,
                    max: 1000,
                });
                break;
            case '1000to10000':
                qb.andWhere('transaction.amount >= :min AND transaction.amount < :max', {
                    min: 1000,
                    max: 10000,
                });
                break;
            case 'over10000':
                qb.andWhere('transaction.amount >= :min', { min: 10000 });
                break;
        }

        qb.orderBy(`transaction.${sortBy}`, sortOrder);

        const [transactions, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: transactions.map((t) => ({
                id: t.id,
                transactionReference: t.transactionReference,
                user: t.user
                    ? {
                        id: t.user.id,
                        name: t.user.name,
                        email: t.user.email,
                    }
                    : null,
                type: t.type,
                amount: t.amount,
                currency: t.currency,
                status: t.status,
                paymentMethod: t.paymentMethod,
                gatewayName: t.gatewayName,
                createdAt: t.createdAt,
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // 2. Statistics for the four KPI cards
    async getTransactionStats() {
        const repo = this.databaseService.transactionRepository;

        const totalTransactions = await repo.count();

        // Sum absolute values so refunds contribute to transaction volume
        // without subtracting from payment volume.
        const volumeResult = await repo
            .createQueryBuilder('t')
            .select('COALESCE(SUM(ABS(t.amount)), 0)', 'volume')
            .getRawOne();

        const averageResult = await repo
            .createQueryBuilder('t')
            .select('COALESCE(AVG(ABS(t.amount)), 0)', 'average')
            .getRawOne();

        const successfulTransactions = await repo
            .createQueryBuilder('t')
            .where('t.status IN (:...statuses)', {
                statuses: [TransactionStatus.SUCCESS, TransactionStatus.REFUNDED],
            })
            .getCount();

        const successRate = totalTransactions
            ? Number(
                ((successfulTransactions / totalTransactions) * 100).toFixed(1),
            )
            : 0;

        return {
            totalTransactions,
            totalVolume: Number(volumeResult.volume),
            averageTransaction: Number(averageResult.average),
            successRate,
        };
    }

    // 3. Transaction detail, supporting UUID or transaction reference
    async getTransactionById(id: string) {
        const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const qb = this.databaseService.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.user', 'user');

        if (isUuid) {
            qb.where('transaction.id = :id', { id });
        } else {
            qb.where('transaction.transactionReference = :reference', {
                reference: id.startsWith('#') ? id.slice(1) : id,
            });
        }

        const transaction = await qb.getOne();

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        // Load processing events from the existing transaction_events table.
        const events = await this.databaseService.transactionEventRepository.find({
            where: { transactionId: transaction.id },
            order: { createdAt: 'ASC' },
        });

        // Load refunds linked to this transaction.
        const refunds = await this.databaseService.refundRepository.find({
            where: { transactionId: transaction.id },
            order: { createdAt: 'DESC' },
        });

        return {
            transaction: {
                id: transaction.id,
                transactionReference: transaction.transactionReference,
                type: transaction.type,
                status: transaction.status,
                amount: transaction.amount,
                currency: transaction.currency,
                paymentMethod: transaction.paymentMethod,
                paymentDetails: transaction.paymentDetails,
                gatewayName: transaction.gatewayName,
                gatewayTransactionId: transaction.gatewayTransactionId,
                gatewayReference: transaction.gatewayReference,
                settlementStatus: transaction.settlementStatus,
                settledAt: transaction.settledAt,
                settlementUtr: transaction.settlementUtr,
                settledAmount: transaction.settledAmount,
                initiatedAt: transaction.initiatedAt,
                paidAt: transaction.paidAt,
                failureReason: transaction.failureReason,
                notes: transaction.notes,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
            },
            customer: transaction.user
                ? {
                    id: transaction.user.id,
                    name: transaction.user.name,
                    email: transaction.user.email,
                    status: transaction.user.status,
                    role: transaction.user.role,
                    createdAt: transaction.user.createdAt,
                    lastActiveAt: transaction.user.lastActiveAt,
                }
                : null,
            processingHistory: events,
            refunds,
        };
    }


    async createTransaction(dto: CreateTransactionDto) {
        const user = await this.databaseService.userRepository.findOne({
            where: { id: dto.userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (dto.bookingId) {
            const booking = await this.databaseService.bookingRepository.findOne({
                where: { id: dto.bookingId },
            });

            if (!booking) {
                throw new NotFoundException('Booking not found');
            }

            if (booking.userId !== dto.userId) {
                throw new BadRequestException(
                    'Booking does not belong to the specified user',
                );
            }
        }

        const paymentDetails = dto.paymentDetails ?? {};

        // Validate required payment details
        switch (dto.paymentMethod) {
            case PaymentMethod.UPI: {
                if (!paymentDetails.upiId?.trim()) {
                    throw new BadRequestException(
                        'upiId is required for UPI transactions',
                    );
                }

                if (
                    !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(
                        paymentDetails.upiId.trim(),
                    )
                ) {
                    throw new BadRequestException('Invalid UPI ID format');
                }

                break;
            }

            case PaymentMethod.CREDIT_CARD:
            case PaymentMethod.DEBIT_CARD: {
                if (!paymentDetails.cardNumber?.trim()) {
                    throw new BadRequestException(
                        'cardNumber is required for card transactions',
                    );
                }

                if (!paymentDetails.bankName?.trim()) {
                    throw new BadRequestException(
                        'bankName is required for card transactions',
                    );
                }

                break;
            }

            case PaymentMethod.NET_BANKING: {
                if (!paymentDetails.bankName?.trim()) {
                    throw new BadRequestException(
                        'bankName is required for net banking transactions',
                    );
                }

                break;
            }
        }

        const transaction = this.databaseService.transactionRepository.create({
            transactionReference: `TXN-${randomUUID()
                .replace(/-/g, '')
                .slice(0, 8)
                .toUpperCase()}`,
            userId: dto.userId,
            bookingId: dto.bookingId ?? null,
            type: dto.type,
            amount: String(dto.amount),
            currency: dto.currency ?? 'USD',
            paymentMethod: dto.paymentMethod,
            gatewayName: dto.gatewayName ?? null,
            gatewayTransactionId: dto.gatewayTransactionId ?? null,
            gatewayReference: dto.gatewayReference ?? null,
            paymentDetails,
            notes: dto.notes ?? null,
            status: TransactionStatus.PENDING,
            initiatedAt: new Date(),
            paidAt: null,
            failureReason: null,
        });

        const saved = await this.databaseService.transactionRepository.save(
            transaction,
        );

        return {
            message: 'Transaction created successfully',
            data: saved,
        };
    }


    // Update transaction status

    async updateTransactionStatus(
        id: string,
        dto: UpdateTransactionStatusDto,
    ) {
        const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const transaction =
            await this.databaseService.transactionRepository.findOne({
                where: isUuid
                    ? { id }
                    : {
                        transactionReference: id.startsWith('#')
                            ? id.slice(1)
                            : id,
                    },
            });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        if (transaction.status === dto.status) {
            throw new ConflictException(
                `Transaction is already ${dto.status}`,
            );
        }

        const allowedTransitions: Record<
            TransactionStatus,
            TransactionStatus[]
        > = {
            [TransactionStatus.PENDING]: [
                TransactionStatus.SUCCESS,
                TransactionStatus.FAILED,
            ],
            [TransactionStatus.SUCCESS]: [
                TransactionStatus.REFUNDED,
            ],
            [TransactionStatus.FAILED]: [],
            [TransactionStatus.REFUNDED]: [],
        };

        if (!allowedTransitions[transaction.status]?.includes(dto.status)) {
            throw new BadRequestException(
                `Cannot change transaction status from ${transaction.status} to ${dto.status}`,
            );
        }

        // Validate payment details before marking the transaction successful.
        if (dto.status === TransactionStatus.SUCCESS) {
            if (!transaction.paymentMethod) {
                throw new BadRequestException(
                    'Payment method is required to mark the transaction as successful',
                );
            }

            this.validatePaymentDetails(
                transaction.paymentMethod,
                transaction.paymentDetails,
            );
        }

        if (
            dto.status === TransactionStatus.FAILED &&
            !dto.failureReason?.trim()
        ) {
            throw new BadRequestException(
                'failureReason is required when marking a transaction as failed',
            );
        }

        transaction.status = dto.status;

        if (dto.status === TransactionStatus.SUCCESS) {
            transaction.paidAt = new Date();
            transaction.failureReason = null;
        }

        if (dto.status === TransactionStatus.FAILED) {
            transaction.failureReason = dto.failureReason!.trim();
        }

        if (dto.status === TransactionStatus.REFUNDED) {
            transaction.failureReason = null;
        }

        if (dto.notes !== undefined) {
            transaction.notes = dto.notes;
        }

        const saved =
            await this.databaseService.transactionRepository.save(transaction);

        return {
            message: 'Transaction status updated successfully',
            data: saved,
        };
    }

    private validatePaymentDetails(
        paymentMethod: PaymentMethod,
        paymentDetails: Record<string, string> | null,
    ): void {
        const details = paymentDetails ?? {};

        switch (paymentMethod) {
            case PaymentMethod.UPI: {
                if (!details.upiId?.trim()) {
                    throw new BadRequestException(
                        'upiId is required for a successful UPI transaction',
                    );
                }

                if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(details.upiId.trim())) {
                    throw new BadRequestException('Invalid UPI ID format');
                }

                break;
            }

            case PaymentMethod.CREDIT_CARD:
            case PaymentMethod.DEBIT_CARD: {
                if (!details.cardNumber?.trim()) {
                    throw new BadRequestException(
                        'cardNumber is required for a successful card transaction',
                    );
                }

                if (!details.bankName?.trim()) {
                    throw new BadRequestException(
                        'bankName is required for a successful card transaction',
                    );
                }

                break;
            }

            case PaymentMethod.NET_BANKING: {
                if (!details.bankName?.trim()) {
                    throw new BadRequestException(
                        'bankName is required for a successful net banking transaction',
                    );
                }

                break;
            }

            default:
                break;
        }
    }


    async exportTransactionsCsv(query: TransactionQueryDto): Promise<string> {
        const {
            search,
            type,
            status,
            paymentMethod,
            startDate,
            endDate,
            dateRange = '30d',
            amountRange = 'all',
            sortBy = 'createdAt',
            sortOrder = 'DESC',
        } = query;

        // Whitelist sortable columns to prevent SQL injection.
        const allowedSortFields = [
            'createdAt',
            'amount',
            'status',
            'type',
            'transactionReference',
        ];

        const safeSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : 'createdAt';

        const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        const qb = this.databaseService.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.user', 'user');

        if (search?.trim()) {
            const term = `%${search.trim()}%`;

            qb.andWhere(
                `(
                CAST(transaction.id AS TEXT) ILIKE :term
                OR transaction.transactionReference ILIKE :term
                OR transaction.gatewayTransactionId ILIKE :term
                OR user.name ILIKE :term
                OR user.email ILIKE :term
            )`,
                { term },
            );
        }

        if (type) {
            qb.andWhere('transaction.type = :type', { type });
        }

        if (status) {
            qb.andWhere('transaction.status = :status', { status });
        }

        if (paymentMethod) {
            qb.andWhere('transaction.paymentMethod = :paymentMethod', {
                paymentMethod,
            });
        }

        // Explicit dates take precedence over the preset.
        if (startDate) {
            const start = new Date(startDate);

            if (Number.isNaN(start.getTime())) {
                throw new BadRequestException('Invalid startDate');
            }

            qb.andWhere('transaction.createdAt >= :startDate', {
                startDate: start,
            });
        }

        if (endDate) {
            const end = new Date(endDate);

            if (Number.isNaN(end.getTime())) {
                throw new BadRequestException('Invalid endDate');
            }

            end.setHours(23, 59, 59, 999);

            qb.andWhere('transaction.createdAt <= :endDate', {
                endDate: end,
            });
        } else if (!startDate && dateRange !== 'all') {
            const days =
                dateRange === '7d' ? 7 :
                    dateRange === '90d' ? 90 : 30;

            const from = new Date();
            from.setDate(from.getDate() - days);

            qb.andWhere('transaction.createdAt >= :from', { from });
        }

        switch (amountRange) {
            case 'under100':
                qb.andWhere('transaction.amount < :max', { max: 100 });
                break;

            case '100to1000':
                qb.andWhere(
                    'transaction.amount >= :min AND transaction.amount < :max',
                    { min: 100, max: 1000 },
                );
                break;

            case '1000to10000':
                qb.andWhere(
                    'transaction.amount >= :min AND transaction.amount < :max',
                    { min: 1000, max: 10000 },
                );
                break;

            case 'over10000':
                qb.andWhere('transaction.amount >= :min', { min: 10000 });
                break;
        }

        qb.orderBy(`transaction.${safeSortBy}`, safeSortOrder);

        // Intentionally do not use skip() or take():
        // export every transaction matching the filters.
        const transactions = await qb.getMany();

        const headers = [
            'Transaction ID',
            'Transaction Reference',
            'User ID',
            'User Name',
            'User Email',
            'Type',
            'Amount',
            'Currency',
            'Status',
            'Payment Method',
            'Gateway Name',
            'Created At',
        ];

        // Escape CSV values and protect spreadsheet users from formula injection.
        const escapeCsv = (value: unknown): string => {
            let text = value == null ? '' : String(value);

            if (/^[\t\r ]*[=+\-@]/.test(text)) {
                text = `'${text}`;
            }

            return `"${text.replace(/"/g, '""')}"`;
        };

        const rows = transactions.map((t) => [
            t.id,
            t.transactionReference,
            t.user?.id ?? '',
            t.user?.name ?? '',
            t.user?.email ?? '',
            t.type,
            t.amount,
            t.currency,
            t.status,
            t.paymentMethod,
            t.gatewayName,
            t.createdAt instanceof Date
                ? t.createdAt.toISOString()
                : t.createdAt,
        ]);

        return [
            headers.map(escapeCsv).join(','),
            ...rows.map((row) => row.map(escapeCsv).join(',')),
        ].join('\r\n');
    }


}
