export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export type AnalyticsScope = 'all' | 'storefront' | 'apps';

export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export type TrafficSource = 'search' | 'social' | 'direct';

export type PaymentPlan = 'avista' | '2x' | '3x';

export type SellerName = 'Francisco Araújo' | 'Karina' | 'Venda Direta';

export type TrackingEventType =
  | 'pageview'
  | 'app_view'
  | 'feature_click'
  | 'add_to_cart'
  | 'purchase_request'
  | 'purchase'
  | 'heartbeat'
  | 'duration_ping';

export interface AppCatalogItem {
  id: string;
  trackingId: string;
  name: string;
  clientBusinessName: string;
  category: 'Beleza e Estética' | 'Alimentação' | 'Papelaria' | 'Serviços Locais';
  tagline: string;
  description: string;
  price: number;
  imageUrl: string;
  features: string[];
  popularProducts: string[];
  clientPortalEnabled: boolean;
}

export interface StoreProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  summary: string;
}

export interface TrackEventPayload {
  sessionHash: string;
  trackingId: string;
  scope: 'storefront' | 'app';
  eventType: TrackingEventType;
  page: string;
  appId?: string;
  productId?: string;
  productName?: string;
  featureName?: string;
  deviceType: DeviceType;
  source: TrafficSource;
  region?: string;
  durationSec?: number;
  consentGiven: boolean;
}

export interface ActiveSessionView {
  sessionHash: string;
  currentPage: string;
  scope: 'storefront' | 'app';
  appId: string | null;
  appName: string;
  deviceType: DeviceType;
  startedAt: string;
  lastSeenAt: string;
}

export interface DailySeriesPoint {
  date: string;
  label: string;
  visitors: number;
  previousVisitors: number;
  pageViews: number;
  purchases: number;
}

export interface AppAnalyticsSummary {
  appId: string;
  trackingId: string;
  name: string;
  clientBusinessName: string;
  category: string;
  clientPortalEnabled: boolean;
  visitors: number;
  uniqueVisitors: number;
  views: number;
  avgDurationSec: number;
  purchaseRequests: number;
  purchases: number;
  conversionRate: number;
  topFeatures: Array<{ name: string; count: number }>;
}

export interface ProductAnalyticsItem {
  productId: string;
  name: string;
  views: number;
  addToCart: number;
  purchases: number;
}

export interface PageAnalyticsItem {
  page: string;
  label: string;
  views: number;
  uniqueVisitors: number;
}

export interface OriginsBreakdown {
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  sources: {
    search: number;
    social: number;
    direct: number;
  };
  regions: Array<{ region: string; visitors: number }>;
}

export interface PrivacySettings {
  retentionDays: 30 | 90 | 180 | 365;
  collectApproxRegion: boolean;
  anonymizeSessions: boolean;
  requireConsentBanner: boolean;
  totalStoredEvents: number;
  lastPurgeAt: string | null;
}

export interface AnalyticsSummaryResponse {
  range: DateRangePreset;
  startDate: string;
  endDate: string;
  scope: AnalyticsScope;
  selectedAppId: string | null;
  isDemoAnnotated: boolean;
  kpis: {
    totalVisitors: number;
    uniqueVisitors: number;
    onlineNow: number;
    todayVisitors: number;
    weekVisitors: number;
    monthVisitors: number;
    totalPageViews: number;
    addToCartCount: number;
    purchasesCount: number;
    conversionRate: number;
    storefrontVisitors: number;
    appsTotalVisitors: number;
    storefrontConversionRate: number;
    appsConversionRate: number;
    previousPeriodVisitors: number;
    periodGrowthPercent: number;
  };
  dailySeries: DailySeriesPoint[];
  monthlyComparison: Array<{
    month: string;
    storefrontVisitors: number;
    appsVisitors: number;
    purchases: number;
  }>;
  topApps: AppAnalyticsSummary[];
  topProducts: ProductAnalyticsItem[];
  topPages: PageAnalyticsItem[];
  origins: OriginsBreakdown;
  activeSessions: ActiveSessionView[];
  privacySettings: PrivacySettings;
}

export interface SaleRecord {
  id: string;
  orderCode: string;
  createdAt: string;
  customerName: string;
  customerBusiness: string;
  itemName: string;
  paymentPlan: PaymentPlan;
  installmentLabel: string;
  grossAmount: number;
  sellerName: SellerName;
  sellerRole?: string;
  commissionRate: number; // 0.5 for 50%
  commissionAmount: number;
  netAmount: number;
  status: 'Confirmada' | 'Pendente';
}

export interface SellerCommissionSummary {
  sellerName: SellerName;
  roleLabel: string;
  commissionRate: number;
  salesCount: number;
  totalGross: number;
  totalCommission: number;
}

export interface FinancialSummaryResponse {
  totals: {
    grossRevenue: number;
    totalCommissions: number;
    netRevenue: number;
    salesCount: number;
    averageTicket: number;
    avistaCount: number;
    installment2xCount: number;
    installment3xCount: number;
  };
  sellers: SellerCommissionSummary[];
  sales: SaleRecord[];
}

export type AlertMetricType =
  | 'visitors_today'
  | 'visitors_total'
  | 'sales_count'
  | 'sales_revenue';

export interface AlertRule {
  id: string;
  title: string;
  metric: AlertMetricType;
  threshold: number;
  enabled: boolean;
  notifyInUi: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
}

export interface AlertNotification {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  metric: AlertMetricType;
  threshold: number;
  actualValue: number;
  triggeredAt: string;
  read: boolean;
}

export interface AlertsOverviewResponse {
  rules: AlertRule[];
  notifications: AlertNotification[];
  unreadCount: number;
  currentMetrics: {
    visitorsToday: number;
    visitorsTotal: number;
    salesCount: number;
    salesRevenue: number;
  };
}

