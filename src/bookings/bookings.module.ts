import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { DatabaseModule } from 'src/database/database.module';
import { AuthGuard } from 'src/auth/user.authGuard';
import { AuthModule } from 'src/auth/auth.module';
import { AdminModule } from 'src/admin/admin.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [DatabaseModule, AdminModule, RedisModule],
  providers: [BookingsService, AuthGuard],
  controllers: [BookingsController]
})
export class BookingsModule { }
