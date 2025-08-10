import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

