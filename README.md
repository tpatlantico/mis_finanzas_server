
```
mis_finanzas_server
├─ .prettierrc
├─ ecosystem.config.js
├─ eslint.config.mjs
├─ nest-cli.json
├─ package-lock.json
├─ package.json
├─ README.md
├─ src
│  ├─ admin
│  │  ├─ admin.controller.ts
│  │  ├─ admin.module.ts
│  │  └─ admin.service.ts
│  ├─ app.controller.spec.ts
│  ├─ app.controller.ts
│  ├─ app.module.ts
│  ├─ app.service.ts
│  ├─ auth
│  │  ├─ auth.module.ts
│  │  ├─ controller
│  │  │  └─ auth.controller.ts
│  │  ├─ decorator
│  │  │  └─ public.decorator.ts
│  │  ├─ guards
│  │  │  └─ JwtGuard.guard.ts
│  │  ├─ models
│  │  │  └─ token.model.ts
│  │  ├─ services
│  │  │  └─ auth.service.ts
│  │  └─ strategies
│  │     ├─ jwt.strategy.ts
│  │     └─ local.strategy.ts
│  ├─ common
│  │  ├─ base.service.ts
│  │  └─ common.module.ts
│  ├─ config.ts
│  ├─ db
│  │  └─ db.module.ts
│  ├─ main
│  │  ├─ analytics
│  │  │  ├─ analytics.controller.ts
│  │  │  ├─ analytics.module.ts
│  │  │  ├─ analytics.service.ts
│  │  │  └─ dto
│  │  │     └─ get-daily-performance.dto.ts
│  │  ├─ business
│  │  │  ├─ business.controller.ts
│  │  │  ├─ business.module.ts
│  │  │  ├─ business.service.ts
│  │  │  └─ dto
│  │  │     ├─ CreateBusiness.ts
│  │  │     ├─ CreateBusinessWithPointsDto.dto.ts
│  │  │     ├─ CreatePointSale.dto.ts
│  │  │     ├─ updateBusiness.dto.ts
│  │  │     └─ UpdatePuntoVentaDto.ts
│  │  ├─ expense-categories
│  │  │  ├─ expense-categories.controller.ts
│  │  │  ├─ expense-categories.module.ts
│  │  │  └─ expense-categories.service.ts
│  │  ├─ financial-analysis
│  │  │  ├─ dto
│  │  │  │  ├─ config-verification.dto.ts
│  │  │  │  ├─ createFixedCost.dto.ts
│  │  │  │  ├─ quick-confirmation.dto.ts
│  │  │  │  └─ updateFixedCost.dto.ts
│  │  │  ├─ financial-analysis.controller.ts
│  │  │  ├─ financial-analysis.module.ts
│  │  │  └─ financial-analysis.service.ts
│  │  ├─ fixed-cost
│  │  │  ├─ fixed-cost.controller.ts
│  │  │  ├─ fixed-cost.module.ts
│  │  │  └─ fixed-cost.service.ts
│  │  ├─ main.module.ts
│  │  ├─ point-sale
│  │  │  ├─ dto
│  │  │  │  ├─ CreatePoitnSale.dt.ts
│  │  │  │  └─ UpdatePointSale.dto.ts
│  │  │  ├─ point-sale.controller.ts
│  │  │  ├─ point-sale.module.ts
│  │  │  └─ point-sale.service.ts
│  │  ├─ products
│  │  │  ├─ dto
│  │  │  │  ├─ CreateProductDto.ts
│  │  │  │  └─ UpdateProductDto .ts
│  │  │  ├─ products.controller.ts
│  │  │  ├─ products.module.ts
│  │  │  └─ products.service.ts
│  │  ├─ transactions
│  │  │  ├─ dto
│  │  │  │  ├─ CreateExpenseCategoryDto.ts
│  │  │  │  ├─ CreateTransactionDto.ts
│  │  │  │  └─ TransactionDateDto .ts
│  │  │  ├─ transactions.controller.ts
│  │  │  ├─ transactions.module.ts
│  │  │  └─ transactions.service.ts
│  │  └─ user
│  │     ├─ dto
│  │     │  ├─ CreateUserDto.ts
│  │     │  └─ updateUser.dto.ts
│  │     ├─ user.controller.ts
│  │     ├─ user.module.ts
│  │     └─ user.service.ts
│  ├─ main.ts
│  └─ tools
│     ├─ tools.controller.ts
│     ├─ tools.module.ts
│     └─ tools.service.ts
├─ test
│  ├─ app.e2e-spec.ts
│  └─ jest-e2e.json
├─ tsconfig.build.json
├─ tsconfig.json
└─ utils
   └─ transaction.ts

```