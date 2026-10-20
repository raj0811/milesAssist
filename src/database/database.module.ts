
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseService } from './database.service';
import { Admin } from './schemas/admin.entity';
import { User } from './schemas/user.entity';
import { Transaction } from './schemas/transaction.entity';
import { Booking } from './schemas/booking.entity';
import { SystemAlert } from './schemas/system-alert.entity';
import { TransactionEvent } from './schemas/transaction-event.entity';
import { Refund } from './schemas/refund.entity';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres' as const,
                url: configService.getOrThrow<string>('DATABASE_URL'),

                autoLoadEntities: true,
                synchronize: false,

                // Never run migrations automatically on application startup.
                migrationsRun: false,

                // Migration files will be compiled into dist/migrations.
                migrations: [__dirname + '/../migrations/*{.js,.ts}'],

                ssl: { rejectUnauthorized: false },
            }),
        }),
        TypeOrmModule.forFeature([
            Admin,
            User,
            Transaction,
            Booking,
            SystemAlert,
            Refund,
            TransactionEvent,
        ]),
    ],
    providers: [DatabaseService],
    exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule { }
