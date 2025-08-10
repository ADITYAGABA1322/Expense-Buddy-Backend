import { Controller, Post, Body, UseGuards, Request, Get, Query, Logger } from '@nestjs/common';
import { SyncService, SyncExpenseData } from './sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private syncService: SyncService) {}

  @Get('last-sync')
  async getLastSyncTime(@Request() req) {
    this.logger.log(`Getting last sync time for user: ${req.user.id}`);
    const lastSync = await this.syncService.getLastSyncTime(req.user.id);
    return { lastSyncTime: lastSync };
  }

  @Post('expenses')
  async syncExpenses(@Request() req, @Body() { expenses }: { expenses: SyncExpenseData[] }) {
    this.logger.log(`Syncing ${expenses.length} expenses for user: ${req.user.id}`);
    const results: { success: boolean }[] = await this.syncService.syncExpenses(req.user.id, expenses);
    return { 
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }
    };
  }

  @Get('expenses')
  async getUpdatedExpenses(
    @Request() req,
    @Query('lastSyncTime') lastSyncTime: string,
  ) {
    this.logger.log(`Getting updated expenses for user: ${req.user.id} since: ${lastSyncTime}`);
    const lastSync = lastSyncTime ? new Date(lastSyncTime) : new Date(0);
    const expenses = await this.syncService.getUpdatedExpenses(req.user.id, lastSync);
    return { expenses };
  }

  @Get('stats')
  async getSyncStats(@Request() req) {
    this.logger.log(`Getting sync stats for user: ${req.user.id}`);
    const stats = await this.syncService.getSyncStats(req.user.id);
    return stats;
  }
}