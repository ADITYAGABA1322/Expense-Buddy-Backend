import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    this.logger.log(`Creating expense for user ${userId}: ${createExpenseDto.title}`);
    
    const { date, ...rest } = createExpenseDto;
    
    const expense = await this.prisma.expense.create({
      data: {
        ...rest,
        date: date ? new Date(date) : new Date(),
        userId,
        syncedAt: new Date(),
      },
    });

    this.logger.log(`Expense created with ID: ${expense.id}`);
    return expense;
  }

  async findAll(userId: string, query: QueryExpenseDto) {
    this.logger.log(`Fetching expenses for user ${userId} with filters: ${JSON.stringify(query)}`);
    
    const { category, startDate, endDate, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    this.logger.log(`Found ${expenses.length} expenses out of ${total} total`);

    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSummary(userId: string, startDate?: string, endDate?: string) {
    this.logger.log(`Getting summary for user ${userId} from ${startDate} to ${endDate}`);
    
    const where: any = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [totalExpenses, categoryBreakdown] = await Promise.all([
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
      }),
    ]);

    // Get monthly trend data
    const expenses = await this.prisma.expense.findMany({
      where,
      select: {
        date: true,
        amount: true,
      },
      orderBy: { date: 'asc' },
    });

    // Group by month
    const monthlyData = new Map();
    expenses.forEach(expense => {
      const monthKey = expense.date.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { amount: 0, count: 0, date: new Date(monthKey + '-01') });
      }
      const existing = monthlyData.get(monthKey);
      existing.amount += expense.amount;
      existing.count += 1;
    });

    const monthlyTrend = Array.from(monthlyData.values()).map(data => ({
      date: data.date,
      _sum: { amount: data.amount },
      _count: data.count,
    }));

    const summary = {
      totalAmount: totalExpenses._sum.amount || 0,
      totalCount: totalExpenses._count,
      averageAmount: totalExpenses._avg.amount || 0,
        categoryBreakdown,
      monthlyTrend,
    };

    this.logger.log(`Summary generated: ${summary.totalCount} expenses totaling ${summary.totalAmount}`);
    return summary;
  }

  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return expense;
  }

  async update(id: string, userId: string, updateExpenseDto: UpdateExpenseDto) {
    await this.findOne(id, userId); // Check ownership

    const { date, ...rest } = updateExpenseDto;
    
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...rest,
        ...(date && { date: new Date(date) }),
        syncedAt: new Date(),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Check ownership

    return this.prisma.expense.delete({
      where: { id },
    });
  }

  // async getSummary(userId: string, startDate?: string, endDate?: string) {
  //   const where: any = { userId };

  //   if (startDate || endDate) {
  //     where.date = {};
  //     if (startDate) where.date.gte = new Date(startDate);
  //     if (endDate) where.date.lte = new Date(endDate);
  //   }

  //   const [totalExpenses, categoryBreakdown, monthlyTrend] = await Promise.all([
  //     this.prisma.expense.aggregate({
  //       where,
  //       _sum: { amount: true },
  //       _count: true,
  //     }),
  //     this.prisma.expense.groupBy({
  //       by: ['category'],
  //       where,
  //       _sum: { amount: true },
  //       _count: true,
  //     }),
  //     this.prisma.expense.groupBy({
  //       by: ['date'],
  //       where,
  //       _sum: { amount: true },
  //       _count: true,
  //     }),
  //   ]);

  //   return {
  //     totalAmount: totalExpenses._sum.amount || 0,
  //     totalCount: totalExpenses._count,
  //     categoryBreakdown,
  //     monthlyTrend,
  //   };
  // }
}