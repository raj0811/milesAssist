import { BadRequestException, Body, Controller, Get, HttpException, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AdminRole, CreateUserDto, GetUsersQueryDto, UpdateUserDto } from 'src/dto/user.dto';
import { AuthGuard } from 'src/auth/user.authGuard';

@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
    ) { }

    @Get("fetch")
    @UseGuards(AuthGuard)
    async getUsers(@Query() query: GetUsersQueryDto) {
        return this.userService.getUsers(query);
    }

    @Get('stats')
    @UseGuards(AuthGuard)
    async userStats() {
        return this.userService.userStats();
    }

    @Post('create')
    @UseGuards(AuthGuard) // assuming admins will create users 
    createUser(@Req() req: any, @Body() data: CreateUserDto) {
        try {
            if (req.user?.role !== AdminRole.SUPER_ADMIN) {
                throw new UnauthorizedException('You Dont Have permision');
            }
            return this.userService.createUser(data);
        } catch (e) {
            if (e instanceof HttpException) {
                throw e;
            }

            throw new BadRequestException('Failed to create user');
        }
    }

    @Get(':id')
    @UseGuards(AuthGuard)
    getUserById(@Param('id') id: string) {
        return this.userService.getUserById(id);
    }

    // Update user profile
    @Patch(':id')
    @UseGuards(AuthGuard)
    updateUser(
        @Req() req: any,
        @Param('id') id: string,
        @Body() data: UpdateUserDto,
    ) {
        try {
            if (req.user?.role !== AdminRole.SUPER_ADMIN) {
                throw new UnauthorizedException('You Dont Have permision');
            }
            return this.userService.updateUser(id, data);
        } catch (e) {
            if (e instanceof HttpException) {
                throw e;
            }

            throw new BadRequestException('Failed to update user');
        }
    }
}
