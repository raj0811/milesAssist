import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from 'src/admin/admin.service';

import { UserService } from 'src/user/user.service';

interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
}

interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly adminService: AdminService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request =
            context.switchToHttp().getRequest<AuthenticatedRequest>();

        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException(
                'Authorization token is required',
            );
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            throw new UnauthorizedException('Token is required');
        }

        request.user = await this.adminService.validateToken(token);

        return true;
    }
}