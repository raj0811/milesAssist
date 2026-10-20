import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CancelBookingDto, CreateBookingDto, RescheduleBookingDto } from 'src/dto/bookings.dto';
import { AuthGuard } from 'src/auth/user.authGuard';

@Controller('bookings')
export class BookingsController {
    constructor(
        private readonly bookingService: BookingsService,
    ) { }

    // GET /bookings?search=john&status=confirmed
    @Get()
    async getAllBookings(
        @Query('page') page = '1',
        @Query('limit') limit = '10',
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('sortBy') sortBy = 'createdAt',
        @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const parsedPage = Number(page);
        const parsedLimit = Number(limit);

        if (!Number.isInteger(parsedPage) || parsedPage < 1) {
            throw new BadRequestException(
                'page must be a positive integer',
            );
        }

        if (
            !Number.isInteger(parsedLimit) ||
            parsedLimit < 1 ||
            parsedLimit > 100
        ) {
            throw new BadRequestException(
                'limit must be between 1 and 100',
            );
        }

        return this.bookingService.getAllBookings(
            parsedPage,
            parsedLimit,
            search,
            status,
            sortBy,
            sortOrder,
            startDate,
            endDate,
        );
    }



    @Get('stats')
    @UseGuards(AuthGuard)
    async getBookingStats() {
        return this.bookingService.getBookingStats();
    }

    @Get(':id')
    @UseGuards(AuthGuard)
    getBookingById(@Param('id') id: string) {
        return this.bookingService.getBookingById(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard)
    updateBooking(
        @Param('id') id: string,
        @Body() dto: RescheduleBookingDto,
    ) {
        return this.bookingService.updateBooking(id, dto);
    }

    @Patch(':id/reschedule')
    @UseGuards(AuthGuard)
    rescheduleBooking(
        @Param('id') id: string,
        @Body() dto: RescheduleBookingDto,
    ) {
        return this.bookingService.rescheduleBooking(id, dto);
    }

    @Patch(':id/cancel')
    @UseGuards(AuthGuard)
    cancelBooking(
        @Param('id') id: string,
        @Body() dto: CancelBookingDto,
    ) {
        return this.bookingService.cancelBooking(id, dto);
    }

    @Post('create')
    async createBooking(@Body() dto: CreateBookingDto) {
        return this.bookingService.createBooking(dto);
    }
}