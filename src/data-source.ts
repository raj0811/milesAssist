
import 'dotenv/config';
import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';

import { Admin } from './database/schemas/admin.entity';
import { User } from './database/schemas/user.entity';
import { Transaction } from './database/schemas/transaction.entity';
import { Booking } from './database/schemas/booking.entity';
import { SystemAlert } from './database/schemas/system-alert.entity';
import { TransactionEvent } from './database/schemas/transaction-event.entity';
import { Refund } from './database/schemas/refund.entity';

export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,

    entities: [
        Admin,
        User,
        Transaction,
        Booking,
        SystemAlert,
        TransactionEvent,
        Refund,
    ],

    migrations: ['src/migrations/*.ts'],
    synchronize: false,
    migrationsRun: false,

    ssl: { rejectUnauthorized: false },
});
