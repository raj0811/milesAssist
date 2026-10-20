import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/auth/user.authGuard';
import { AdminModule } from 'src/admin/admin.module';
import { AdminService } from 'src/admin/admin.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [DatabaseModule, AdminModule, RedisModule],
  providers: [UserService, AdminService, JwtService],
  controllers: [UserController]
})
export class UserModule { }
