import { Controller, Get } from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  @Get('health')
  getHealth() {
    this.logger.log('Health check endpoint called');
    return {
      status: 'success',
      message: 'ExpenseBuddy API is running perfectly! 💰',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth/*',
        expenses: '/api/expenses/*',
        sync: '/api/sync/*',
        users: '/api/users/*'
      }
    };
  }

  @Get('welcome')
  getWelcome() {
    this.logger.log('Welcome endpoint called');
    return {
      message: 'Welcome to ExpenseBuddy API! 🎉',
      description: 'Your personal expense tracking companion',
      features: [
        'User Authentication',
        'Expense Management',
        'Offline Sync',
        'Multi-Currency Support',
        'Data Analytics'
      ]
    };
  }
}