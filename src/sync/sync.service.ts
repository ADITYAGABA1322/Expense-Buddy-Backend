import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface SyncExpenseData {
  id?: string;
  title: string;
  amount: number;
  category: string;
  currency: string;
  date: string;
  description?: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  localId?: string; // For offline created expenses
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  async getLastSyncTime(userId: string) {
    this.logger.log(`Getting last sync time for user: ${userId}`);
    
    const lastSync = await this.prisma.syncLog.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });

    const syncTime = lastSync?.timestamp || new Date(0);
    this.logger.log(`Last sync time for user ${userId}: ${syncTime}`);
    
    return syncTime;
  }

  async syncExpenses(userId: string, expenses: SyncExpenseData[]) {
    this.logger.log(`Starting sync for user ${userId} with ${expenses.length} expenses`);
    const results: Array<
      | { success: true; data: any; localId?: string }
      | { success: false; error: string; expense: SyncExpenseData; localId?: string }
    > = [];

    for (const expense of expenses) {
      try {
        let result;
        
        if (expense.operation === 'UPDATE' && expense.id) {
          this.logger.log(`Updating expense: ${expense.id}`);
          result = await this.updateExpense(userId, expense);
        } else if (expense.operation === 'DELETE' && expense.id) {
          this.logger.log(`Deleting expense: ${expense.id}`);
          result = await this.deleteExpense(userId, expense.id);
        } else {
          // CREATE
          this.logger.log(`Creating new expense: ${expense.title}`);
          result = await this.createExpense(userId, expense);
        }

        results.push({ success: true, data: result, localId: expense.localId });

        // Log sync operation
        await this.logSyncOperation(userId, expense);

      } catch (error) {
        this.logger.error(`Sync failed for expense ${expense.id || expense.localId}: ${error.message}`);
        results.push({ 
          success: false, 
          error: error.message, 
          expense,
          localId: expense.localId 
        });
      }
    }

    this.logger.log(`Sync completed for user ${userId}. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
    return results;
  }

  private async createExpense(userId: string, expense: SyncExpenseData) {
    return this.prisma.expense.create({
      data: {
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        currency: expense.currency || 'USD',
        date: new Date(expense.date),
        description: expense.description,
        userId,
        syncedAt: new Date(),
      },
    });
  }

  private async updateExpense(userId: string, expense: SyncExpenseData) {
    // Verify ownership
    const existing = await this.prisma.expense.findFirst({
      where: { id: expense.id, userId },
    });

    if (!existing) {
      throw new Error('Expense not found or access denied');
    }

    return this.prisma.expense.update({
      where: { id: expense.id },
      data: {
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        currency: expense.currency,
        date: new Date(expense.date),
        description: expense.description,
        syncedAt: new Date(),
      },
    });
  }

  private async deleteExpense(userId: string, expenseId: string) {
    // Verify ownership
    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!existing) {
      throw new Error('Expense not found or access denied');
    }

    await this.prisma.expense.delete({
      where: { id: expenseId },
    });

    return { id: expenseId, deleted: true };
  }

  private async logSyncOperation(userId: string, expense: SyncExpenseData) {
    await this.prisma.syncLog.create({
      data: {
        userId,
        operation: expense.operation,
        entityId: expense.id || expense.localId || 'unknown',
        entityType: 'EXPENSE',
      },
    });
  }

  async getUpdatedExpenses(userId: string, lastSyncTime: Date) {
    this.logger.log(`Getting updated expenses for user ${userId} since ${lastSyncTime}`);
    
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        updatedAt: {
          gt: lastSyncTime,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    this.logger.log(`Found ${expenses.length} updated expenses for user ${userId}`);
    return expenses;
  }

  async getSyncStats(userId: string) {
    const [totalSyncs, lastSync, pendingCount] = await Promise.all([
      this.prisma.syncLog.count({ where: { userId } }),
      this.prisma.syncLog.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.expense.count({
        where: { userId, syncedAt: null },
      }),
    ]);

    return {
      totalSyncs,
      lastSyncTime: lastSync?.timestamp,
      pendingSync: pendingCount,
    };
  }
}