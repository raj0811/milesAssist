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

    @Get('stats')
    @UseGuards(AuthGuard)
    getTransactionStats() {
        return this.transactionService.getTransactionStats();
    }

    @Get(':id')
    @UseGuards(AuthGuard)
    getTransactionById(@Param('id') id: string) {
        return this.transactionService.getTransactionById(id);
    }


    @Post()
    @UseGuards(AuthGuard)
    createTransaction(@Body() dto: CreateTransactionDto) {
        return this.transactionService.createTransaction(dto);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard)
    updateTransactionStatus(
        @Param('id') id: string,
        @Body() dto: UpdateTransactionStatusDto,
    ) {
        return this.transactionService.updateTransactionStatus(id, dto);
    }
}
