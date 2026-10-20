
import {
    Controller,
    Get,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/user.authGuard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
    ) { }

    // 1. Overview KPI cards
    @Get('overview')
    @UseGuards(AuthGuard)
    getOverview() {
        return this.dashboardService.getOverview();
    }

    // 2. Revenue chart
    @Get('revenue')
    @UseGuards(AuthGuard)
    getRevenueChart(
        @Query('range') range: '7d' | '1m' | '3m' | '6m' | '1y' = '6m',
    ) {
        return this.dashboardService.getRevenueChart(range);
    }

    // 3. System alerts
    @Get('alerts')
    @UseGuards(AuthGuard)
    getAlerts() {
        return this.dashboardService.getAlerts();
    }

    // 4. Recent transactions
    @Get('recent-transactions')
    @UseGuards(AuthGuard)
    getRecentTransactions(
        @Query('limit', new DefaultValuePipe(5), ParseIntPipe)
        limit: number,
    ) {
        return this.dashboardService.getRecentTransactions(limit);
    }

    // 5. System health
    @Get('system-health')
    @UseGuards(AuthGuard)
    getSystemHealth() {
        return this.dashboardService.getSystemHealth();
    }
}