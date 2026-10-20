import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Query,
    Body,
    UseGuards,
} from '@nestjs/common';

import { TransactionService } from './transaction.service';
import {
    CreateTransactionDto,
    TransactionQueryDto,
    UpdateTransactionStatusDto,
} from 'src/dto/transactions.dto';
import { AuthGuard } from 'src/auth/user.authGuard';

@Controller('transactions')
export class TransactionController {
    constructor(
        private readonly transactionService: TransactionService,
    ) { }

    // 1. Get all transactions with pagination and filters
    @Get()
    @UseGuards(AuthGuard)
    getAllTransactions(@Query() query: TransactionQueryDto) {
        return this.transactionService.getAllTransactions(query);
    }

    @Get('csv')
    @UseGuards(AuthGuard)
    getAllTransactionsCsv(@Query() query: TransactionQueryDto) {
        return this.transactionService.getAllTransactions(query);
    }

    // 2. Get transaction statistics for dashboard KPI cards
    @Get('stats')
    @UseGuards(AuthGuard)
    getTransactionStats() {
        return this.transactionService.getTransactionStats();
    }

    // 3. Get transaction details by UUID or transaction reference
    @Get(':id')
    @UseGuards(AuthGuard)
    getTransactionById(@Param('id') id: string) {
        return this.transactionService.getTransactionById(id);
    }

    // 4. Create a transaction
    @Post()
    @UseGuards(AuthGuard)
    createTransaction(@Body() dto: CreateTransactionDto) {
        return this.transactionService.createTransaction(dto);
    }

    // 5. Update transaction status by UUID or transaction reference
    @Patch(':id/status')
    @UseGuards(AuthGuard)
    updateTransactionStatus(
        @Param('id') id: string,
        @Body() dto: UpdateTransactionStatusDto,
    ) {
        return this.transactionService.updateTransactionStatus(id, dto);
    }
}
