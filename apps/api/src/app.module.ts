import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { DealsModule } from './modules/deals/deals.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ProductsModule } from './modules/products/products.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { BlueprintsModule } from './modules/blueprints/blueprints.module';
import { CadencesModule } from './modules/cadences/cadences.module';
import { CallScriptsModule } from './modules/call-scripts/call-scripts.module';
import { ChatterModule } from './modules/chatter/chatter.module';
import { ConstraintsModule } from './modules/constraints/constraints.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { AccountPlansModule } from './modules/account-plans/account-plans.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PrmModule } from './modules/prm/prm.module';
import { PublicModule } from './modules/public/public.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { FieldServiceModule } from './modules/field-service/field-service.module';
import { BillingModule } from './modules/billing/billing.module';
import { AiModule } from './modules/ai/ai.module';
import { CustomModulesModule } from './modules/custom-modules/custom-modules.module';
import { SalesProgramsModule } from './modules/sales-programs/sales-programs.module';
import { RoutingModule } from './modules/routing/routing.module';
import { AgentsModule } from './modules/agents/agents.module';
import { DataGraphModule } from './modules/data-graph/data-graph.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { AssetsModule } from './modules/assets/assets.module';
import { CasesModule } from './modules/cases/cases.module';
import { CopilotModule } from './modules/copilot/copilot.module';
import { CtiModule } from './modules/cti/cti.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { DealRegistrationsModule } from './modules/deal-registrations/deal-registrations.module';
import { EmailsModule } from './modules/emails/emails.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { JourneysModule } from './modules/journeys/journeys.module';
import { MdfModule } from './modules/mdf/mdf.module';
import { RevopsModule } from './modules/revops/revops.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FilesModule } from './modules/files/files.module';
import { FieldHistoryModule } from './modules/field-history/field-history.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { PortalsModule } from './modules/portals/portals.module';
import { RmaModule } from './modules/rma/rma.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ForecastingModule } from './modules/forecasting/forecasting.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { PlaybooksModule } from './modules/playbooks/playbooks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SearchModule } from './modules/search/search.module';
import { TerritoriesModule } from './modules/territories/territories.module';
import { UsersModule } from './modules/users/users.module';
import { WorkqueueModule } from './modules/workqueue/workqueue.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    AccountsModule,
    ContactsModule,
    LeadsModule,
    DealsModule,
    ProductsModule,
    QuotesModule,
    ActivitiesModule,
    TerritoriesModule,
    IntegrationModule,
    SearchModule,
    WorkqueueModule,
    ReportsModule,
    OrdersModule,
    InvoicesModule,
    InventoryModule,
    PaymentsModule,
    SubscriptionsModule,
    ContractsModule,
    ApprovalsModule,
    ForecastingModule,
    CadencesModule,
    DocumentsModule,
    ConstraintsModule,
    UsersModule,
    PipelinesModule,
    ChatterModule,
    FieldHistoryModule,
    PlaybooksModule,
    CallScriptsModule,
    CurrenciesModule,
    BlueprintsModule,
    FilesModule,
    CtiModule,
    VendorsModule,
    MarketingModule,
    KnowledgeModule,
    DealRegistrationsModule,
    PortalsModule,
    AccountPlansModule,
    CasesModule,
    AssetsModule,
    RmaModule,
    CopilotModule,
    MdfModule,
    IncidentsModule,
    JourneysModule,
    RevopsModule,
    EmailsModule,
    AnalyticsModule,
    PrmModule,
    PublicModule,
    ComplianceModule,
    FieldServiceModule,
    BillingModule,
    AiModule,
    CustomModulesModule,
    SalesProgramsModule,
    RoutingModule,
    AgentsModule,
    DataGraphModule,
    GamificationModule,
  ],
})
export class AppModule {}