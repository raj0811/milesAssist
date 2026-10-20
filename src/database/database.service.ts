
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './schemas/admin.entity';
import { User } from './schemas/user.entity';
import { Transaction } from './schemas/transaction.entity';
import { Booking } from './schemas/booking.entity';
import { SystemAlert } from './schemas/system-alert.entity';
import { Refund } from './schemas/refund.entity';
import { TransactionEvent } from './schemas/transaction-event.entity';

@Injectable()
export class DatabaseService {
    constructor(
        @InjectRepository(Admin)
        public readonly adminRepository: Repository<Admin>,
        @InjectRepository(User)
        public readonly userRepository: Repository<User>,
        @InjectRepository(Transaction)
        public readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(Booking)
        public readonly bookingRepository: Repository<Booking>,
        @InjectRepository(SystemAlert)
        public readonly systemAlertRepository: Repository<SystemAlert>,
        @InjectRepository(Refund)
        public readonly refundRepository: Repository<Refund>,
        @InjectRepository(TransactionEvent)
        public readonly transactionEventRepository: Repository<TransactionEvent>,
    ) { }
}
