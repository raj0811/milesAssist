import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking, BookingStatus } from '../database/schemas/booking.entity';
import { DatabaseService } from 'src/database/database.service';
import { CancelBookingDto, CreateBookingDto, RescheduleBookingDto } from 'src/dto/bookings.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class BookingsService {
    constructor(
        private readonly databaseService: DatabaseService,
    ) { }

    // Get all bookings with optional search and status filters

    async getAllBookings(
        page = 1,
        limit = 10,
        search?: string,
        status?: string,
        sortBy = 'createdAt',
        sortOrder: 'ASC' | 'DESC' = 'DESC',
        startDate?: string,
        endDate?: string,
    ) {
        const bookingRepository = this.databaseService.bookingRepository;

        // Validate pagination
        page = Math.max(1, Number(page) || 1);
        limit = Math.min(100, Math.max(1, Number(limit) || 10));

        // Whitelist sortable columns to prevent unsafe column selection
        const allowedSortFields = [
            'createdAt',
            'updatedAt',
            'scheduledAt',
            'amount',
            'status',
            'serviceName',
            'bookingReference',
        ];

        if (!allowedSortFields.includes(sortBy)) {
            sortBy = 'createdAt';
        }

        sortOrder =
            sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const query = bookingRepository
            .createQueryBuilder('booking')
            .leftJoinAndSelect('booking.user', 'user');

        // Search by booking reference, service, customer name or email
        if (search?.trim()) {
            query.andWhere(
                `(
                booking."bookingReference" ILIKE :search
                OR booking."serviceName" ILIKE :search
                OR user.name ILIKE :search
                OR user.email ILIKE :search
            )`,
                { search: `%${search.trim()}%` },
            );
        }

        // Filter by booking status
        if (status && status.toLowerCase() !== 'all') {
            const allowedStatuses = Object.values(BookingStatus);

            if (!allowedStatuses.includes(status as BookingStatus)) {
                throw new BadRequestException(
                    `Invalid booking status. Allowed values: ${allowedStatuses.join(', ')}`,
                );
            }

            query.andWhere('booking.status = :status', { status });
        }

        // Filter by scheduled date range
        if (startDate) {
            const start = new Date(startDate);

            if (Number.isNaN(start.getTime())) {
                throw new BadRequestException('Invalid startDate');
            }

            query.andWhere('booking.scheduledAt >= :startDate', {
                startDate: start,
            });
        }

        if (endDate) {
            const end = new Date(endDate);

            if (Number.isNaN(end.getTime())) {
                throw new BadRequestException('Invalid endDate');
            }

            query.andWhere('booking.scheduledAt <= :endDate', {
                endDate: end,
            });
        }

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            throw new BadRequestException(
                'startDate must be before or equal to endDate',
            );
        }

        // Sorting
        query.orderBy(`booking.${sortBy}`, sortOrder);

        // Stable secondary sorting when multiple records share the same value
        if (sortBy !== 'createdAt') {
            query.addOrderBy('booking.createdAt', 'DESC');
        }

        // Pagination
        const [bookings, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: bookings,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }


    // Get booking dashboard statistics
    async getBookingStats() {
        const bookingRepository = this.databaseService.bookingRepository;

        const [
            totalBookings,
            pendingBookings,
            confirmedBookings,
            completedBookings,
            cancelledBookings,
        ] = await Promise.all([
            bookingRepository.count(),
            bookingRepository.count({
                where: { status: BookingStatus.PENDING },
            }),
            bookingRepository.count({
                where: { status: BookingStatus.CONFIRMED },
            }),
            bookingRepository.count({
                where: { status: BookingStatus.COMPLETED },
            }),
            bookingRepository.count({
                where: { status: BookingStatus.CANCELLED },
            }),
        ]);

        return {
            totalBookings,
            activeBookings: pendingBookings + confirmedBookings,
            completedBookings,
            cancelledBookings,
        };
    }

    async getBookingById(id: string) {
        try {
            const booking = await this.databaseService.bookingRepository
                .createQueryBuilder('booking')
                .leftJoinAndSelect('booking.user', 'user')
                .leftJoinAndSelect('booking.transactions', 'transaction')
                .where(
                    '(booking.id = CAST(:id AS uuid) OR booking.bookingReference = :reference)',
                    {
                        id,
                        reference: id,
                    },
                )
                .orderBy('transaction.createdAt', 'DESC')
                .getOne();

            if (!booking) {
                throw new NotFoundException('Booking not found');
            }

            const { user, transactions, ...bookingDetails } = booking;

            return {
                booking: bookingDetails,

                customer: user
                    ? {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        status: user.status,
                        role: user.role,
                        createdAt: user.createdAt,
                        lastActiveAt: user.lastActiveAt,
                    }
                    : null,

                transactions: (transactions ?? []).map((transaction) => ({
                    id: transaction.id,
                    transactionReference: transaction.transactionReference,
                    type: transaction.type,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    status: transaction.status,
                    initiatedAt: transaction.initiatedAt,
                    paidAt: transaction.paidAt,
                    failureReason: transaction.failureReason,
                    gatewayName: transaction.gatewayName,
                    gatewayTransactionId: transaction.gatewayTransactionId,
                    gatewayReference: transaction.gatewayReference,
                    paymentMethod: transaction.paymentMethod,
                    paymentDetails: transaction.paymentDetails,
                    settlementStatus: transaction.settlementStatus,
                    settledAt: transaction.settledAt,
                    settlementUtr: transaction.settlementUtr,
                    settledAmount: transaction.settledAmount,
                    notes: transaction.notes,
                    createdAt: transaction.createdAt,
                })),
            };
        } catch (e) {
            throw new BadRequestException(e.message)
        }
    }

    async createBooking(dto: CreateBookingDto) {
        const user = await this.databaseService.userRepository.findOne({
            where: { id: dto.userId },
        });

        if (!user) {
            throw new NotFoundException('Customer not found');
        }

        const scheduledAt = new Date(dto.scheduledAt);

        if (scheduledAt <= new Date()) {
            throw new BadRequestException('Booking must be scheduled in the future');
        }

        const booking = this.databaseService.bookingRepository.create({
            bookingReference: `BKG-${randomUUID().slice(0, 8).toUpperCase()}`,
            userId: dto.userId,
            serviceName: dto.serviceName,
            meetingType: dto.meetingType,
            scheduledAt,
            durationMinutes: dto.durationMinutes,
            meetingLocation: dto.meetingLocation ?? null,
            meetingUrl: dto.meetingUrl ?? null,
            specialNotes: dto.specialNotes ?? null,
            amount: String(dto.amount),
            currency: dto.currency ?? 'USD',
            status: BookingStatus.PENDING,
            confirmedAt: null,
            completedAt: null,
            cancelledAt: null,
            cancellationReason: null,
        });

        return this.databaseService.bookingRepository.save(booking);
    }

    async updateBooking(id: string, dto: RescheduleBookingDto) {
        const booking = await this.findBooking(id);

        this.ensureBookingCanChange(booking.status);

        if (dto.scheduledAt !== undefined) {
            const scheduledAt = new Date(dto.scheduledAt);

            if (scheduledAt <= new Date()) {
                throw new BadRequestException(
                    'New booking time must be in the future',
                );
            }

            booking.scheduledAt = scheduledAt;
        }

        if (dto.durationMinutes !== undefined) {
            booking.durationMinutes = dto.durationMinutes;
        }

        if (dto.meetingType !== undefined) {
            booking.meetingType = dto.meetingType;
        }

        if (dto.meetingLocation !== undefined) {
            booking.meetingLocation = dto.meetingLocation;
        }

        if (dto.meetingUrl !== undefined) {
            booking.meetingUrl = dto.meetingUrl;
        }

        if (dto.specialNotes !== undefined) {
            booking.specialNotes = dto.specialNotes;
        }

        return this.databaseService.bookingRepository.save(booking);
    }

    async rescheduleBooking(id: string, dto: RescheduleBookingDto) {
        return this.updateBooking(id, dto);
    }

    async cancelBooking(id: string, dto: CancelBookingDto) {
        const booking = await this.findBooking(id);

        if (booking.status === BookingStatus.CANCELLED) {
            throw new ConflictException('Booking is already cancelled');
        }

        if (
            booking.status === BookingStatus.COMPLETED
        ) {
            throw new BadRequestException(
                'Completed bookings cannot be cancelled',
            );
        }

        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        booking.cancellationReason = dto.cancellationReason ?? null;

        // in real life case wee needed to initiate the refund for that perticular booking if already paid and update the status of refund using webhooks or pg APIs
        return this.databaseService.bookingRepository.save(booking);
    }

    private async findBooking(id: string) {
        const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const booking = await this.databaseService.bookingRepository.findOne({
            where: isUuid
                ? { id }
                : { bookingReference: id },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        return booking;
    }

    private ensureBookingCanChange(status: BookingStatus) {
        if (
            status === BookingStatus.CANCELLED ||
            status === BookingStatus.COMPLETED
        ) {
            throw new BadRequestException(
                'Cancelled or completed bookings cannot be modified',
            );
        }
    }
}