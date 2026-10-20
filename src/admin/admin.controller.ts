import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto, LoginDto } from 'src/dto/user.dto';
import { AuthGuard } from 'src/auth/user.authGuard';

@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
    ) { }

    @Post('/create')
    async createAdmin(@Body() data: CreateAdminDto) {
        return this.adminService.createAdmin(data);
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.adminService.login(dto.email, dto.password);
    }

    @Get('/user')
    @UseGuards(AuthGuard)
    async getUser(@Req() req: any) {
        return this.adminService.getAdminById(req.user.id)
    }
}
