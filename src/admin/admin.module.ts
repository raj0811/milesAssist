import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AuthGuard } from 'src/auth/user.authGuard';

@Module({
  imports: [DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AuthGuard],
  exports: [AdminService]
})
export class AdminModule { }
