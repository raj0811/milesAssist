import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { DatabaseModule } from 'src/database/database.module';
import { AuthGuard } from 'src/auth/user.authGuard';
import { AdminModule } from 'src/admin/admin.module';

@Module({
    imports: [DatabaseModule, AdminModule],
    controllers: [TransactionController],
    providers: [TransactionService, AuthGuard],
    exports: [TransactionService]
})
export class TransactionModule { }
