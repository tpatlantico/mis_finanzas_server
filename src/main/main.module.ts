import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module';
import { BusinessModule } from './business/business.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UserModule } from './user/user.module';
import { ProductsModule } from './products/products.module';
import { FinancialAnalysisModule } from './financial-analysis/financial-analysis.module';
import { PointSaleModule } from './point-sale/point-sale.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { FixedCostModule } from './fixed-cost/fixed-cost.module';

@Module({
    imports: [
        AnalyticsModule,
        BusinessModule,
        TransactionsModule,
        UserModule,
        ProductsModule,
        FinancialAnalysisModule,
        PointSaleModule,
        ExpenseCategoriesModule,
        FixedCostModule
    ],
    exports: [
        AnalyticsModule,
        BusinessModule,
        TransactionsModule,
        UserModule,
        ProductsModule,
        FinancialAnalysisModule
    ]
})
export class MainModule { }
