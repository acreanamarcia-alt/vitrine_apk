export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export type AnalyticsScope = 'all' | 'storefront' | 'apps';

export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export type TrafficSource = 'search' | 'social' | 'direct';

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
