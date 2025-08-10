import { Module } from '@nestjs/common';
import { ExpensesService } from './expense.service';
import { ExpensesController } from './expense.controller';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}