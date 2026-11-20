import fs from 'node:fs';
import path from 'node:path';
import type {
  ActiveSessionView,
  AlertMetricType,
  AlertNotification,
  AlertRule,
  AlertsOverviewResponse,
  AnalyticsScope,
  AnalyticsSummaryResponse,
  AppAnalyticsSummary,
  DailySeriesPoint,
  DateRangePreset,
  DeviceType,
  FinancialSummaryResponse,
  PaymentPlan,
  PrivacySettings,
  SaleRecord,
  SellerCommissionSummary,
  SellerName,
  TrackEventPayload,
  TrafficSource,
} from '../types/analytics';

interface AppMetadataRecord {
  appId: string;
  trackingId: string;
  name: string;
  clientBusinessName: string;
  category: string;
  clientPortalEnabled: boolean;
}

interface DailyAggregateRecord {
  date: string; // YYYY-MM-DD
  scope: 'storefront' | 'app';
  appId: string | null;
  visitors: number;
  uniqueVisitors: number;
  pageViews: number;
  addToCart: number;
  purchaseRequests: number;
  purchases: number;
  totalDurationSec: number;
  durationSamples: number;
  devices: Record<DeviceType, number>;
  sources: Record<TrafficSource, number>;
  regions: Record<string, number>;
  features: Record<string, number>;
  pages: Record<string, number>;
  products: Record<string, { name: string; views: number; addToCart: number; purchases: number }>;
  isBaselineSeed?: boolean;
}

interface LiveSessionRecord {
  sessionHash: string;
  currentPage: string;
  scope: 'storefront' | 'app';
  appId: string | null;
  appName: string;
  deviceType: DeviceType;
  startedAt: number;
  lastSeenAt: number;
  seenDays: Record<string, boolean>;
}

interface PersistedDatabase {
  apps: AppMetadataRecord[];
  dailyAggregates: DailyAggregateRecord[];
  privacySettings: PrivacySettings;
  monthlyHistory: Array<{
    month: string;
    storefrontVisitors: number;
    appsVisitors: number;
    purchases: number;
  }>;
  salesLedger: SaleRecord[];
  alertRules: AlertRule[];
  alertNotifications: AlertNotification[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'analytics-db.json');

const BASE_APPS: AppMetadataRecord[] = [
  {
    appId: 'barbearia',
    trackingId: 'VAA-BARB-01',
    name: 'Aplicativo de Barbearia',
    clientBusinessName: 'Barbearia Navalha de Ouro',
    category: 'Beleza e Estética',
    clientPortalEnabled: true,
  },
  {
    appId: 'confeitaria',
    trackingId: 'VAA-CONF-03',
    name: 'Aplicativo de Confeiteira(o)',
    clientBusinessName: 'Confeitaria Doce Encanto',
    category: 'Alimentação',
    clientPortalEnabled: true,
  },
  {
    appId: 'kit-papelaria',
    trackingId: 'VAA-PAPEL-07',
    name: 'Aplicativo Kit Papelaria',
    clientBusinessName: 'Ateliê Papel & Encanto',
    category: 'Papelaria',
    clientPortalEnabled: true,
  },
  {
    appId: 'salao-beleza',
    trackingId: 'VAA-SALAO-02',
    name: 'Aplicativo de Salão de Beleza',
    clientBusinessName: 'Studio Lumière Beleza',
    category: 'Beleza e Estética',
    clientPortalEnabled: true,
  },
  {
    appId: 'estudio-unhas',
    trackingId: 'VAA-UNHA-04',
    name: 'Aplicativo de Estúdio de Unhas',
    clientBusinessName: 'Atelier Nail Design',
    category: 'Beleza e Estética',
    clientPortalEnabled: false,
  },
  {
    appId: 'pet-shop',
    trackingId: 'VAA-PET-05',
    name: 'Aplicativo de Pet Shop & Banho',
    clientBusinessName: 'Villa Pet Cuidados',
    category: 'Serviços Locais',
    clientPortalEnabled: true,
  },
];

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, delta: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

const WEEKDAY_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function createEmptyAggregate(
  date: string,
  scope: 'storefront' | 'app',
  appId: string | null,
  isBaselineSeed = false,
): DailyAggregateRecord {
  return {
    date,
    scope,
    appId,
    visitors: 0,
    uniqueVisitors: 0,
    pageViews: 0,
    addToCart: 0,
    purchaseRequests: 0,
    purchases: 0,
    totalDurationSec: 0,
    durationSamples: 0,
    devices: { mobile: 0, desktop: 0, tablet: 0 },
    sources: { search: 0, social: 0, direct: 0 },
    regions: {},
    features: {},
    pages: {},
    products: {},
    isBaselineSeed,
  };
}

function resolveInstallmentLabel(plan: PaymentPlan, grossAmount: number): string {
  if (plan === '2x') {
    const part = (grossAmount / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `2x de R$ ${part}`;
  }
  if (plan === '3x') {
    const part = (grossAmount / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `3x de R$ ${part}`;
  }
  const full = grossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `À vista · R$ ${full}`;
}

function buildInitialSalesLedger(): SaleRecord[] {
  const now = Date.now();
  const makeDate = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

  const seeds: Array<Omit<SaleRecord, 'commissionRate' | 'commissionAmount' | 'netAmount' | 'installmentLabel'>> = [
    {
      id: 'sale-seed-01',
      orderCode: 'VAA-2601',
      createdAt: makeDate(6),
      customerName: 'Carlos Mendes',
      customerBusiness: 'Barbearia Corte Fino',
      itemName: 'Aplicativo de Barbearia',
      paymentPlan: 'avista',
      grossAmount: 350.0,
      sellerName: 'Francisco Araújo',
      sellerRole: 'Vendedor',
      status: 'Confirmada',
    },
    {
      id: 'sale-seed-02',
      orderCode: 'VAA-2602',
      createdAt: makeDate(5),
      customerName: 'Juliana Ribeiro',
      customerBusiness: 'Confeitaria Sabor Real',
      itemName: 'Aplicativo de Confeiteira(o)',
      paymentPlan: '2x',
      grossAmount: 350.0,
      sellerName: 'Karina',
      sellerRole: 'Cunhada',
      status: 'Confirmada',
    },
    {
      id: 'sale-seed-03',
      orderCode: 'VAA-2603',
      createdAt: makeDate(4),
      customerName: 'Mariana Souza',
      customerBusiness: 'Ateliê Encanto Escolar',
      itemName: 'Aplicativo Kit Papelaria + Criação e Instalação de Domínio',
      paymentPlan: '3x',
      grossAmount: 490.0,
      sellerName: 'Karina',
      sellerRole: 'Cunhada',
      status: 'Confirmada',
    },
    {
      id: 'sale-seed-04',
      orderCode: 'VAA-2604',
      createdAt: makeDate(3),
      customerName: 'Rafael Oliveira',
      customerBusiness: 'Studio Lumière',
      itemName: 'Aplicativo de Salão de Beleza',
      paymentPlan: '3x',
      grossAmount: 390.0,
      sellerName: 'Francisco Araújo',
      sellerRole: 'Vendedor',
      status: 'Confirmada',
    },
    {
      id: 'sale-seed-05',
      orderCode: 'VAA-2605',
      createdAt: makeDate(1),
      customerName: 'Patrícia Lima',
      customerBusiness: 'Atelier Nail Design',
      itemName: 'Aplicativo de Estúdio de Unhas',
      paymentPlan: '2x',
      grossAmount: 350.0,
      sellerName: 'Karina',
      sellerRole: 'Cunhada',
      status: 'Pendente',
    },
    {
      id: 'sale-seed-06',
      orderCode: 'VAA-2606',
      createdAt: makeDate(0),
      customerName: 'Eduardo Almeida',
      customerBusiness: 'Villa Pet Cuidados',
      itemName: 'Aplicativo de Pet Shop & Banho',
      paymentPlan: 'avista',
      grossAmount: 350.0,
      sellerName: 'Francisco Araújo',
      sellerRole: 'Vendedor',
      status: 'Confirmada',
    },
  ];

  return seeds.map((s) => {
    const commissionRate = s.sellerName === 'Venda Direta' ? 0 : 0.5;
    const commissionAmount = Number((s.grossAmount * commissionRate).toFixed(2));
    const netAmount = Number((s.grossAmount - commissionAmount).toFixed(2));
    return {
      ...s,
      installmentLabel: resolveInstallmentLabel(s.paymentPlan, s.grossAmount),
      commissionRate,
      commissionAmount,
      netAmount,
    };
  });
}

function buildInitialDatabase(): PersistedDatabase {
  const today = new Date();
  const aggregates: DailyAggregateRecord[] = [];

  // Target 30-day realistic baseline aligned with the prompt's visual reference:
  // ~12.580 total visitors, ~18.420 page views, ~346 purchases across 30 days
  // Last 7 days daily storefront + app curve matching Seg 320, Ter 450, Qua 390, Qui 580, Sex 620, Sab 790, Dom 680
  const weekdayTargets: Record<number, number> = {
    1: 320, // Seg
    2: 450, // Ter
    3: 390, // Qua
    4: 580, // Qui
    5: 620, // Sex
    6: 790, // Sáb
    0: 680, // Dom
  };

  // App distribution weights so 30d totals closely reflect:
  // Barbearia ~2.450, Salão ~1.980, Confeitaria ~1.560, Unhas ~1.230, Pet ~840, Odonto ~620 (Apps = 8.680; Storefront = 3.900 -> Total 12.580)
  const appWeights: Array<{
    appId: string;
    total30d: number;
    avgDur: number;
    convRate: number;
    features: string[];
    products: Array<{ id: string; name: string }>;
  }> = [
    {
      appId: 'barbearia',
      total30d: 2450,
      avgDur: 194,
      convRate: 0.036,
      features: ['Agendamento Online', 'Seleção de Barbeiro', 'Clube de Assinatura', 'Catálogo de Pomadas'],
      products: [
        { id: 'barbearia', name: 'Aplicativo de Barbearia Pro (APK + Painel)' },
        { id: 'addon-whatsapp', name: 'Módulo Agendamento & Notificação WhatsApp' },
      ],
    },
    {
      appId: 'salao-beleza',
      total30d: 1980,
      avgDur: 178,
      convRate: 0.031,
      features: ['Catálogo de Procedimentos', 'Reserva por Horário', 'Cartão Fidelidade', 'Galeria Antes e Depois'],
      products: [
        { id: 'salao-beleza', name: 'Aplicativo de Salão de Beleza Completo' },
        { id: 'addon-identidade', name: 'Pacote Identidade Visual & Ícone APK' },
      ],
    },
    {
      appId: 'confeitaria',
      total30d: 1560,
      avgDur: 162,
      convRate: 0.029,
      features: ['Encomenda Sob Medida', 'Cardápio Pronta Entrega', 'Cálculo de Frete Local', 'Checkout WhatsApp'],
      products: [
        { id: 'confeitaria', name: 'Aplicativo de Confeiteira(o) Delivery' },
        { id: 'addon-publicacao', name: 'Publicação Assistida Play Store + APK Assinado' },
      ],
    },
    {
      appId: 'kit-papelaria',
      total30d: 1380,
      avgDur: 168,
      convRate: 0.032,
      features: ['Montagem de Kits por Tema', 'Personalização de Nome e Etiquetas', 'Catálogo Volta às Aulas', 'Orçamento Rápido WhatsApp'],
      products: [{ id: 'kit-papelaria', name: 'Aplicativo Kit Papelaria Completo' }],
    },
    {
      appId: 'estudio-unhas',
      total30d: 1230,
      avgDur: 148,
      convRate: 0.026,
      features: ['Portfólio Nail Art', 'Tabela de Manutenção', 'Agendamento Express', 'Cupom Primeira Visita'],
      products: [{ id: 'estudio-unhas', name: 'Aplicativo de Estúdio de Unhas' }],
    },
    {
      appId: 'pet-shop',
      total30d: 840,
      avgDur: 155,
      convRate: 0.024,
      features: ['Agendamento Banho e Tosa', 'Status do Atendimento', 'Loja de Ração e Acessórios', 'Carteira de Vacinas'],
      products: [{ id: 'pet-shop', name: 'Aplicativo de Pet Shop & Banho' }],
    },
  ];

  const regionsList = [
    { name: 'São Paulo, SP', weight: 0.34 },
    { name: 'Rio de Janeiro, RJ', weight: 0.18 },
    { name: 'Belo Horizonte, MG', weight: 0.14 },
    { name: 'Curitiba, PR', weight: 0.11 },
    { name: 'Porto Alegre, RS', weight: 0.09 },
    { name: 'Salvador, BA', weight: 0.08 },
    { name: 'Recife, PE', weight: 0.06 },
  ];

  // Generate 90 days of deterministic historical baseline so 7d, 30d, 90d & previous-period comparisons are accurate
  for (let offset = 89; offset >= 0; offset--) {
    const d = addDays(today, -offset);
    const ymd = formatDateYMD(d);
    const dow = d.getDay();

    // Scale factor so last 30 days hit ~12.580 total visitors (~3900 storefront + 8680 apps)
    const dayWeight = (weekdayTargets[dow] ?? 420) / 547;
    const isLast7 = offset < 7;
    const targetDayTotal = isLast7 ? weekdayTargets[dow] : Math.round(419 * dayWeight * (offset < 30 ? 1 : 0.86));

    // Storefront gets ~31% of visitors, apps get ~69%
    const sfVisitors = Math.max(12, Math.round(targetDayTotal * 0.31));
    const sfRecord = createEmptyAggregate(ymd, 'storefront', null, true);
    sfRecord.visitors = sfVisitors;
    sfRecord.uniqueVisitors = Math.round(sfVisitors * 0.78);
    sfRecord.pageViews = Math.round(sfVisitors * 1.54);
    sfRecord.addToCart = Math.max(2, Math.round(sfVisitors * 0.12));
    sfRecord.purchaseRequests = Math.max(2, Math.round(sfVisitors * 0.075));
    sfRecord.purchases = Math.max(1, Math.round(sfVisitors * 0.029));
    sfRecord.totalDurationSec = sfVisitors * 135;
    sfRecord.durationSamples = sfVisitors;
    sfRecord.devices = {
      mobile: Math.round(sfVisitors * 0.62),
      desktop: Math.round(sfVisitors * 0.31),
      tablet: Math.max(1, sfVisitors - Math.round(sfVisitors * 0.62) - Math.round(sfVisitors * 0.31)),
    };
    sfRecord.sources = {
      search: Math.round(sfVisitors * 0.44),
      social: Math.round(sfVisitors * 0.34),
      direct: Math.max(1, sfVisitors - Math.round(sfVisitors * 0.44) - Math.round(sfVisitors * 0.34)),
    };
    for (const r of regionsList) {
      sfRecord.regions[r.name] = Math.max(1, Math.round(sfVisitors * r.weight));
    }
    sfRecord.pages['/vitrine'] = Math.round(sfRecord.pageViews * 0.56);
    sfRecord.pages['/checkout'] = Math.round(sfRecord.pageViews * 0.18);
    sfRecord.pages['/comparativo-apps'] = Math.round(sfRecord.pageViews * 0.26);
    sfRecord.products['addon-dominio'] = {
      name: 'Criação e Instalação de Domínio',
      views: Math.round(sfRecord.pageViews * 0.31),
      addToCart: Math.round(sfRecord.addToCart * 0.36),
      purchases: Math.max(0, Math.round(sfRecord.purchases * 0.38)),
    };
    sfRecord.products['addon-identidade'] = {
      name: 'Pacote Identidade Visual & Ícone APK',
      views: Math.round(sfRecord.pageViews * 0.24),
      addToCart: Math.round(sfRecord.addToCart * 0.32),
      purchases: Math.max(0, Math.round(sfRecord.purchases * 0.30)),
    };
    sfRecord.products['addon-whatsapp'] = {
      name: 'Módulo Agendamento & Notificação WhatsApp',
      views: Math.round(sfRecord.pageViews * 0.29),
      addToCart: Math.round(sfRecord.addToCart * 0.32),
      purchases: Math.max(0, Math.round(sfRecord.purchases * 0.32)),
    };
    aggregates.push(sfRecord);

    const appsDayTotal = Math.max(24, targetDayTotal - sfVisitors);
    const totalWeightSum = appWeights.reduce((acc, a) => acc + a.total30d, 0);

    for (const appCfg of appWeights) {
      const appShare = appCfg.total30d / totalWeightSum;
      const appVis = Math.max(3, Math.round(appsDayTotal * appShare));
      const rec = createEmptyAggregate(ymd, 'app', appCfg.appId, true);
      rec.visitors = appVis;
      rec.uniqueVisitors = Math.round(appVis * 0.81);
      rec.pageViews = Math.round(appVis * 1.43);
      rec.addToCart = Math.max(1, Math.round(appVis * 0.095));
      rec.purchaseRequests = Math.max(1, Math.round(appVis * 0.062));
      rec.purchases = Math.max(0, Math.round(appVis * appCfg.convRate));
      rec.totalDurationSec = appVis * appCfg.avgDur;
      rec.durationSamples = appVis;
      rec.devices = {
        mobile: Math.round(appVis * 0.74),
        desktop: Math.round(appVis * 0.19),
        tablet: Math.max(0, appVis - Math.round(appVis * 0.74) - Math.round(appVis * 0.19)),
      };
      rec.sources = {
        search: Math.round(appVis * 0.36),
        social: Math.round(appVis * 0.42),
        direct: Math.max(0, appVis - Math.round(appVis * 0.36) - Math.round(appVis * 0.42)),
      };
      for (const r of regionsList) {
        rec.regions[r.name] = Math.max(0, Math.round(appVis * r.weight));
      }
      rec.pages[`/app/${appCfg.appId}`] = rec.pageViews;
      appCfg.features.forEach((feat, idx) => {
        const factor = Math.max(0.15, 0.48 - idx * 0.1);
        rec.features[feat] = Math.max(1, Math.round(rec.pageViews * factor));
      });
      appCfg.products.forEach((prod, idx) => {
        rec.products[prod.id] = {
          name: prod.name,
          views: Math.round(rec.pageViews * (idx === 0 ? 0.65 : 0.35)),
          addToCart: Math.max(0, Math.round(rec.addToCart * (idx === 0 ? 0.7 : 0.3))),
          purchases: Math.max(0, Math.round(rec.purchases * (idx === 0 ? 0.75 : 0.25))),
        };
      });
      aggregates.push(rec);
    }
  }

  return {
    apps: BASE_APPS,
    dailyAggregates: aggregates,
    privacySettings: {
      retentionDays: 90,
      collectApproxRegion: true,
      anonymizeSessions: true,
      requireConsentBanner: true,
      totalStoredEvents: aggregates.reduce((acc, r) => acc + r.pageViews, 0),
      lastPurgeAt: null,
    },
    monthlyHistory: [
      { month: 'Jun/26', storefrontVisitors: 2640, appsVisitors: 5980, purchases: 214 },
      { month: 'Jul/26', storefrontVisitors: 2980, appsVisitors: 6540, purchases: 248 },
      { month: 'Ago/26', storefrontVisitors: 3210, appsVisitors: 7120, purchases: 279 },
      { month: 'Set/26', storefrontVisitors: 3490, appsVisitors: 7690, purchases: 302 },
      { month: 'Out/26', storefrontVisitors: 3720, appsVisitors: 8240, purchases: 325 },
      { month: 'Nov/26', storefrontVisitors: 3900, appsVisitors: 8680, purchases: 346 },
    ],
    salesLedger: buildInitialSalesLedger(),
    alertRules: buildInitialAlertRules(),
    alertNotifications: [],
  };
}

function buildInitialAlertRules(): AlertRule[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: 'alert-rule-visitors-today',
      title: 'Meta diária de visitantes na plataforma',
      metric: 'visitors_today',
      threshold: 700,
      enabled: true,
      notifyInUi: true,
      createdAt: nowIso,
      lastTriggeredAt: null,
    },
    {
      id: 'alert-rule-sales-revenue',
      title: 'Meta de faturamento bruto (R$)',
      metric: 'sales_revenue',
      threshold: 2500,
      enabled: true,
      notifyInUi: true,
      createdAt: nowIso,
      lastTriggeredAt: null,
    },
    {
      id: 'alert-rule-sales-count',
      title: 'Meta de volume de vendas concluídas',
      metric: 'sales_count',
      threshold: 7,
      enabled: true,
      notifyInUi: true,
      createdAt: nowIso,
      lastTriggeredAt: null,
    },
  ];
}

class AnalyticsStore {
  private db: PersistedDatabase;
  private activeSessions = new Map<string, LiveSessionRecord>();
  private listeners = new Set<() => void>();
  private alertListeners = new Set<(notification: AlertNotification) => void>();

  constructor() {
    this.db = this.loadDatabase();
    // Prune stale active sessions every 10s (inactive > 45 seconds)
    setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [key, sess] of this.activeSessions.entries()) {
        if (now - sess.lastSeenAt > 45_000) {
          this.activeSessions.delete(key);
          changed = true;
        }
      }
      if (changed) this.notify();
    }, 10_000);
  }

  private loadDatabase(): PersistedDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as PersistedDatabase;
        if (parsed && Array.isArray(parsed.dailyAggregates) && Array.isArray(parsed.apps)) {
          const hasAllBaseApps = BASE_APPS.every((ba) => parsed.apps.some((pa) => pa.appId === ba.appId));
          if (hasAllBaseApps) {
            const portalMap = new Map(parsed.apps.map((a) => [a.appId, a.clientPortalEnabled]));
            parsed.apps = BASE_APPS.map((ba) => ({
              ...ba,
              clientPortalEnabled: portalMap.get(ba.appId) ?? ba.clientPortalEnabled,
            }));
            let dirty = false;
            if (!Array.isArray(parsed.salesLedger) || parsed.salesLedger.length === 0) {
              parsed.salesLedger = buildInitialSalesLedger();
              dirty = true;
            }
            if (!Array.isArray(parsed.alertRules)) {
              parsed.alertRules = buildInitialAlertRules();
              dirty = true;
            }
            if (!Array.isArray(parsed.alertNotifications)) {
              parsed.alertNotifications = [];
              dirty = true;
            }
            if (dirty) {
              this.saveDatabase(parsed);
            }
            return parsed;
          }
          // Migrate old baseline while keeping real user-recorded events
          const realEvents = parsed.dailyAggregates.filter((r) => !r.isBaselineSeed);
          const fresh = buildInitialDatabase();
          fresh.dailyAggregates = [...fresh.dailyAggregates, ...realEvents];
          this.saveDatabase(fresh);
          return fresh;
        }
      }
    } catch (err) {
      console.error('Erro ao carregar base de analytics, recriando base inicial:', err);
    }
    const fresh = buildInitialDatabase();
    this.saveDatabase(fresh);
    return fresh;
  }

  private saveDatabase(data: PersistedDatabase = this.db): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf-8');
    } catch (err) {
      console.error('Erro ao persistir base de analytics:', err);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeAlerts(listener: (notification: AlertNotification) => void): () => void {
    this.alertListeners.add(listener);
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // ignore listener failure
      }
    }
  }

  private notifyAlert(notification: AlertNotification): void {
    for (const listener of this.alertListeners) {
      try {
        listener(notification);
      } catch {
        // ignore listener failure
      }
    }
  }

  private resolveAppByTrackingId(trackingId: string, explicitAppId?: string): AppMetadataRecord | undefined {
    if (explicitAppId) {
      const byId = this.db.apps.find((a) => a.appId === explicitAppId);
      if (byId) return byId;
    }
    return this.db.apps.find((a) => a.trackingId === trackingId);
  }

  private getOrCreateTodayRecord(scope: 'storefront' | 'app', appId: string | null): DailyAggregateRecord {
    const todayYmd = formatDateYMD(new Date());
    let rec = this.db.dailyAggregates.find(
      (r) => r.date === todayYmd && r.scope === scope && r.appId === appId && !r.isBaselineSeed,
    );
    if (!rec) {
      rec = createEmptyAggregate(todayYmd, scope, appId, false);
      this.db.dailyAggregates.push(rec);
    }
    return rec;
  }

  public trackEvent(payload: TrackEventPayload): { ok: boolean; recordedAt: string; sessionHash: string } {
    const now = Date.now();
    const todayYmd = formatDateYMD(new Date());
    const safeSessionHash = String(payload.sessionHash || 'anon_sess').slice(0, 24);
    const resolvedApp = payload.scope === 'app' ? this.resolveAppByTrackingId(payload.trackingId, payload.appId) : undefined;
    const effectiveScope: 'storefront' | 'app' = resolvedApp ? 'app' : 'storefront';
    const effectiveAppId = resolvedApp ? resolvedApp.appId : null;
    const effectiveAppName = resolvedApp ? resolvedApp.name : 'Loja VitrineApkAc';

    let session = this.activeSessions.get(safeSessionHash);
    const isNewSession = !session;
    const seenKey = `${todayYmd}:${effectiveScope}:${effectiveAppId ?? 'site'}`;

    if (!session) {
      session = {
        sessionHash: safeSessionHash,
        currentPage: payload.page || '/vitrine',
        scope: effectiveScope,
        appId: effectiveAppId,
        appName: effectiveAppName,
        deviceType: payload.deviceType || 'desktop',
        startedAt: now,
        lastSeenAt: now,
        seenDays: {},
      };
      this.activeSessions.set(safeSessionHash, session);
    } else {
      session.currentPage = payload.page || session.currentPage;
      session.scope = effectiveScope;
      session.appId = effectiveAppId;
      session.appName = effectiveAppName;
      session.deviceType = payload.deviceType || session.deviceType;
      session.lastSeenAt = now;
    }

    const rec = this.getOrCreateTodayRecord(effectiveScope, effectiveAppId);
    const isFirstVisitTodayForScope = !session.seenDays[seenKey];

    if (payload.eventType === 'pageview' || payload.eventType === 'app_view') {
      rec.pageViews += 1;
      const pageKey = payload.page || '/vitrine';
      rec.pages[pageKey] = (rec.pages[pageKey] || 0) + 1;

      if (isFirstVisitTodayForScope) {
        session.seenDays[seenKey] = true;
        rec.visitors += 1;
        if (isNewSession) {
          rec.uniqueVisitors += 1;
        }
        const dev: DeviceType = payload.deviceType || 'desktop';
        rec.devices[dev] = (rec.devices[dev] || 0) + 1;

        const src: TrafficSource = payload.source || 'direct';
        rec.sources[src] = (rec.sources[src] || 0) + 1;

        if (this.db.privacySettings.collectApproxRegion && payload.consentGiven) {
          const regionLabel = payload.region || 'São Paulo, SP';
          rec.regions[regionLabel] = (rec.regions[regionLabel] || 0) + 1;
        } else {
          rec.regions['Não informado (LGPD)'] = (rec.regions['Não informado (LGPD)'] || 0) + 1;
        }
      }

      if (payload.productId && payload.productName) {
        if (!rec.products[payload.productId]) {
          rec.products[payload.productId] = { name: payload.productName, views: 0, addToCart: 0, purchases: 0 };
        }
        rec.products[payload.productId].views += 1;
      }
    } else if (payload.eventType === 'feature_click' && payload.featureName) {
      rec.features[payload.featureName] = (rec.features[payload.featureName] || 0) + 1;
    } else if (payload.eventType === 'add_to_cart') {
      rec.addToCart += 1;
      if (payload.productId && payload.productName) {
        if (!rec.products[payload.productId]) {
          rec.products[payload.productId] = { name: payload.productName, views: 0, addToCart: 0, purchases: 0 };
        }
        rec.products[payload.productId].addToCart += 1;
      }
    } else if (payload.eventType === 'purchase_request') {
      rec.purchaseRequests += 1;
    } else if (payload.eventType === 'purchase') {
      rec.purchases += 1;
      if (payload.productId && payload.productName) {
        if (!rec.products[payload.productId]) {
          rec.products[payload.productId] = { name: payload.productName, views: 0, addToCart: 0, purchases: 0 };
        }
        rec.products[payload.productId].purchases += 1;
      }
    } else if (payload.eventType === 'duration_ping' && typeof payload.durationSec === 'number') {
      const clamped = Math.max(1, Math.min(3600, Math.round(payload.durationSec)));
      rec.totalDurationSec += clamped;
      rec.durationSamples += 1;
    }

    this.db.privacySettings.totalStoredEvents += 1;
    this.evaluateAlertRules(false);
    this.saveDatabase();
    this.notify();

    return {
      ok: true,
      recordedAt: new Date(now).toISOString(),
      sessionHash: safeSessionHash,
    };
  }

  public getActiveSessions(appIdFilter?: string | null): ActiveSessionView[] {
    const list: ActiveSessionView[] = [];
    for (const sess of this.activeSessions.values()) {
      if (appIdFilter && sess.appId !== appIdFilter) continue;
      list.push({
        sessionHash: sess.sessionHash,
        currentPage: sess.currentPage,
        scope: sess.scope,
        appId: sess.appId,
        appName: sess.appName,
        deviceType: sess.deviceType,
        startedAt: new Date(sess.startedAt).toISOString(),
        lastSeenAt: new Date(sess.lastSeenAt).toISOString(),
      });
    }
    return list.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  private resolveDateWindow(
    range: DateRangePreset,
    customStart?: string,
    customEnd?: string,
  ): { startYmd: string; endYmd: string; prevStartYmd: string; prevEndYmd: string; daysCount: number } {
    const today = new Date();
    const endYmd = customEnd && range === 'custom' ? customEnd : formatDateYMD(today);
    let startDateObj = today;

    if (range === 'today') {
      startDateObj = today;
    } else if (range === '7d') {
      startDateObj = addDays(today, -6);
    } else if (range === '30d') {
      startDateObj = addDays(today, -29);
    } else if (range === '90d') {
      startDateObj = addDays(today, -89);
    } else if (range === 'custom' && customStart) {
      const parsed = new Date(`${customStart}T00:00:00`);
      startDateObj = Number.isNaN(parsed.getTime()) ? addDays(today, -6) : parsed;
    }

    const startYmd = range === 'custom' && customStart ? customStart : formatDateYMD(startDateObj);
    const endDateObj = new Date(`${endYmd}T00:00:00`);
    const diffMs = Math.max(0, endDateObj.getTime() - startDateObj.getTime());
    const daysCount = Math.max(1, Math.round(diffMs / 86_400_000) + 1);

    const prevEndObj = addDays(startDateObj, -1);
    const prevStartObj = addDays(prevEndObj, -(daysCount - 1));

    return {
      startYmd,
      endYmd,
      prevStartYmd: formatDateYMD(prevStartObj),
      prevEndYmd: formatDateYMD(prevEndObj),
      daysCount,
    };
  }

  public getSummary(params: {
    range?: DateRangePreset;
    startDate?: string;
    endDate?: string;
    scope?: AnalyticsScope;
    appId?: string | null;
    clientMode?: boolean;
  }): AnalyticsSummaryResponse {
    const range: DateRangePreset = params.range || '7d';
    const scope: AnalyticsScope = params.appId ? 'apps' : params.scope || 'all';
    const selectedAppId = params.appId || null;

    const { startYmd, endYmd, prevStartYmd, prevEndYmd } = this.resolveDateWindow(
      range,
      params.startDate,
      params.endDate,
    );

    const filterRecords = (fromYmd: string, toYmd: string, targetScope: AnalyticsScope, appId: string | null) =>
      this.db.dailyAggregates.filter((r) => {
        if (r.date < fromYmd || r.date > toYmd) return false;
        if (appId) return r.appId === appId;
        if (targetScope === 'storefront') return r.scope === 'storefront';
        if (targetScope === 'apps') return r.scope === 'app';
        return true;
      });

    const currentRecords = filterRecords(startYmd, endYmd, scope, selectedAppId);
    const prevRecords = filterRecords(prevStartYmd, prevEndYmd, scope, selectedAppId);

    const sumField = (list: DailyAggregateRecord[], key: 'visitors' | 'uniqueVisitors' | 'pageViews' | 'addToCart' | 'purchases') =>
      list.reduce((acc, r) => acc + r[key], 0);

    const totalVisitors = sumField(currentRecords, 'visitors');
    const uniqueVisitors = sumField(currentRecords, 'uniqueVisitors');
    const totalPageViews = sumField(currentRecords, 'pageViews');
    const addToCartCount = sumField(currentRecords, 'addToCart');
    const purchasesCount = sumField(currentRecords, 'purchases');
    const conversionRate = totalVisitors > 0 ? Number(((purchasesCount / totalVisitors) * 100).toFixed(2)) : 0;

    const previousPeriodVisitors = sumField(prevRecords, 'visitors');
    const periodGrowthPercent =
      previousPeriodVisitors > 0
        ? Number((((totalVisitors - previousPeriodVisitors) / previousPeriodVisitors) * 100).toFixed(1))
        : 0;

    // Explicit Today / Week / Month metrics (always computed for the selected app/scope)
    const todayYmd = formatDateYMD(new Date());
    const weekStartYmd = formatDateYMD(addDays(new Date(), -6));
    const monthStartYmd = formatDateYMD(addDays(new Date(), -29));

    const todayVisitors = sumField(filterRecords(todayYmd, todayYmd, scope, selectedAppId), 'visitors');
    const weekVisitors = sumField(filterRecords(weekStartYmd, todayYmd, scope, selectedAppId), 'visitors');
    const monthVisitors = sumField(filterRecords(monthStartYmd, todayYmd, scope, selectedAppId), 'visitors');

    // Storefront vs Apps split in current window
    const allInWindow = filterRecords(startYmd, endYmd, 'all', null);
    const sfInWindow = allInWindow.filter((r) => r.scope === 'storefront');
    const appsInWindow = allInWindow.filter((r) => r.scope === 'app');
    const storefrontVisitors = sumField(sfInWindow, 'visitors');
    const appsTotalVisitors = sumField(appsInWindow, 'visitors');
    const sfPurchases = sumField(sfInWindow, 'purchases');
    const appsPurchases = sumField(appsInWindow, 'purchases');
    const storefrontConversionRate =
      storefrontVisitors > 0 ? Number(((sfPurchases / storefrontVisitors) * 100).toFixed(2)) : 0;
    const appsConversionRate =
      appsTotalVisitors > 0 ? Number(((appsPurchases / appsTotalVisitors) * 100).toFixed(2)) : 0;

    // Build Daily Series aligned with previous period
    const byDateCurrent = new Map<string, { visitors: number; pageViews: number; purchases: number }>();
    for (const r of currentRecords) {
      const prev = byDateCurrent.get(r.date) || { visitors: 0, pageViews: 0, purchases: 0 };
      prev.visitors += r.visitors;
      prev.pageViews += r.pageViews;
      prev.purchases += r.purchases;
      byDateCurrent.set(r.date, prev);
    }

    const byDatePrev = new Map<string, number>();
    for (const r of prevRecords) {
      byDatePrev.set(r.date, (byDatePrev.get(r.date) || 0) + r.visitors);
    }

    const startObj = new Date(`${startYmd}T00:00:00`);
    const endObj = new Date(`${endYmd}T00:00:00`);
    const prevStartObj = new Date(`${prevStartYmd}T00:00:00`);

    const dailySeries: DailySeriesPoint[] = [];
    let cursor = new Date(startObj);
    let prevCursor = new Date(prevStartObj);
    let guard = 0;
    while (cursor <= endObj && guard < 120) {
      const ymd = formatDateYMD(cursor);
      const prevYmd = formatDateYMD(prevCursor);
      const curVals = byDateCurrent.get(ymd) || { visitors: 0, pageViews: 0, purchases: 0 };
      const prevVis = byDatePrev.get(prevYmd) || 0;
      const dow = cursor.getDay();
      const shortDate = `${String(cursor.getDate()).padStart(2, '0')}/${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = range === '7d' || range === 'today' ? WEEKDAY_PT[dow] : shortDate;

      dailySeries.push({
        date: ymd,
        label,
        visitors: curVals.visitors,
        previousVisitors: prevVis,
        pageViews: curVals.pageViews,
        purchases: curVals.purchases,
      });

      cursor = addDays(cursor, 1);
      prevCursor = addDays(prevCursor, 1);
      guard++;
    }

    // Per-App Analytics
    const topApps: AppAnalyticsSummary[] = this.db.apps
      .filter((app) => !selectedAppId || app.appId === selectedAppId)
      .map((app) => {
        const appRecs = allInWindow.filter((r) => r.scope === 'app' && r.appId === app.appId);
        const visitors = sumField(appRecs, 'visitors');
        const uniq = sumField(appRecs, 'uniqueVisitors');
        const views = sumField(appRecs, 'pageViews');
        const purReq = appRecs.reduce((acc, r) => acc + r.purchaseRequests, 0);
        const pur = sumField(appRecs, 'purchases');
        const totDur = appRecs.reduce((acc, r) => acc + r.totalDurationSec, 0);
        const durSamples = appRecs.reduce((acc, r) => acc + r.durationSamples, 0);

        const featMap = new Map<string, number>();
        for (const r of appRecs) {
          for (const [k, v] of Object.entries(r.features)) {
            featMap.set(k, (featMap.get(k) || 0) + v);
          }
        }
        const topFeatures = Array.from(featMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        return {
          appId: app.appId,
          trackingId: app.trackingId,
          name: app.name,
          clientBusinessName: app.clientBusinessName,
          category: app.category,
          clientPortalEnabled: app.clientPortalEnabled,
          visitors,
          uniqueVisitors: uniq,
          views,
          avgDurationSec: durSamples > 0 ? Math.round(totDur / durSamples) : 0,
          purchaseRequests: purReq,
          purchases: pur,
          conversionRate: visitors > 0 ? Number(((pur / visitors) * 100).toFixed(2)) : 0,
          topFeatures,
        };
      })
      .sort((a, b) => b.visitors - a.visitors);

    // Top Products
    const prodMap = new Map<string, { productId: string; name: string; views: number; addToCart: number; purchases: number }>();
    for (const r of currentRecords) {
      for (const [pid, pdata] of Object.entries(r.products)) {
        const cur = prodMap.get(pid) || { productId: pid, name: pdata.name, views: 0, addToCart: 0, purchases: 0 };
        cur.views += pdata.views;
        cur.addToCart += pdata.addToCart;
        cur.purchases += pdata.purchases;
        prodMap.set(pid, cur);
      }
    }
    const topProducts = Array.from(prodMap.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);

    // Top Pages
    const pageLabels: Record<string, string> = {
      '/vitrine': 'Vitrine Principal VitrineApkAc',
      '/checkout': 'Carrinho & Finalização de Compra',
      '/comparativo-apps': 'Comparativo de Modelos',
      '/app/barbearia': 'Aplicativo de Barbearia — Demonstração',
      '/app/confeitaria': 'Aplicativo de Confeiteira(o) — Demonstração',
      '/app/kit-papelaria': 'Aplicativo Kit Papelaria — Demonstração',
      '/app/salao-beleza': 'Aplicativo de Salão de Beleza — Demonstração',
      '/app/estudio-unhas': 'Aplicativo de Estúdio de Unhas — Demonstração',
      '/app/pet-shop': 'Aplicativo de Pet Shop & Banho — Demonstração',
    };
    const pageMap = new Map<string, { views: number; uniqueVisitors: number }>();
    for (const r of currentRecords) {
      for (const [pg, views] of Object.entries(r.pages)) {
        const cur = pageMap.get(pg) || { views: 0, uniqueVisitors: 0 };
        cur.views += views;
        cur.uniqueVisitors += Math.round(views * 0.72);
        pageMap.set(pg, cur);
      }
    }
    const topPages = Array.from(pageMap.entries())
      .map(([page, val]) => ({
        page,
        label: pageLabels[page] || page,
        views: val.views,
        uniqueVisitors: val.uniqueVisitors,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);

    // Origins breakdown
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    const sources = { search: 0, social: 0, direct: 0 };
    const regionMap = new Map<string, number>();

    for (const r of currentRecords) {
      devices.mobile += r.devices.mobile || 0;
      devices.desktop += r.devices.desktop || 0;
      devices.tablet += r.devices.tablet || 0;
      sources.search += r.sources.search || 0;
      sources.social += r.sources.social || 0;
      sources.direct += r.sources.direct || 0;
      for (const [reg, cnt] of Object.entries(r.regions)) {
        regionMap.set(reg, (regionMap.get(reg) || 0) + cnt);
      }
    }

    const regions = Array.from(regionMap.entries())
      .map(([region, visitors]) => ({ region, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 7);

    const activeSessions = this.getActiveSessions(selectedAppId);
    const hasBaseline = currentRecords.some((r) => r.isBaselineSeed);

    return {
      range,
      startDate: startYmd,
      endDate: endYmd,
      scope,
      selectedAppId,
      isDemoAnnotated: hasBaseline,
      kpis: {
        totalVisitors,
        uniqueVisitors,
        onlineNow: activeSessions.length,
        todayVisitors,
        weekVisitors,
        monthVisitors,
        totalPageViews,
        addToCartCount,
        purchasesCount,
        conversionRate,
        storefrontVisitors,
        appsTotalVisitors,
        storefrontConversionRate,
        appsConversionRate,
        previousPeriodVisitors,
        periodGrowthPercent,
      },
      dailySeries,
      monthlyComparison: this.db.monthlyHistory,
      topApps,
      topProducts,
      topPages,
      origins: {
        devices,
        sources,
        regions,
      },
      activeSessions,
      privacySettings: this.db.privacySettings,
    };
  }

  public updateAppPermission(appId: string, clientPortalEnabled: boolean): AppMetadataRecord | null {
    const app = this.db.apps.find((a) => a.appId === appId);
    if (!app) return null;
    app.clientPortalEnabled = clientPortalEnabled;
    this.saveDatabase();
    this.notify();
    return app;
  }

  public updatePrivacySettings(partial: Partial<PrivacySettings>): PrivacySettings {
    this.db.privacySettings = {
      ...this.db.privacySettings,
      ...partial,
    };
    this.saveDatabase();
    this.notify();
    return this.db.privacySettings;
  }

  public purgeByRetention(onlyBaseline = false): { removedRecords: number; privacySettings: PrivacySettings } {
    const before = this.db.dailyAggregates.length;
    if (onlyBaseline) {
      this.db.dailyAggregates = this.db.dailyAggregates.filter((r) => !r.isBaselineSeed);
    } else {
      const cutoff = formatDateYMD(addDays(new Date(), -this.db.privacySettings.retentionDays));
      this.db.dailyAggregates = this.db.dailyAggregates.filter((r) => r.date >= cutoff);
    }
    const removedRecords = before - this.db.dailyAggregates.length;
    this.db.privacySettings.lastPurgeAt = new Date().toISOString();
    this.db.privacySettings.totalStoredEvents = this.db.dailyAggregates.reduce((acc, r) => acc + r.pageViews, 0);
    this.saveDatabase();
    this.notify();
    return { removedRecords, privacySettings: this.db.privacySettings };
  }

  public getPublicVisitorCount(): { totalVisitors: number; todayVisitors: number; onlineNow: number } {
    const todayYmd = formatDateYMD(new Date());
    const storefrontRecords = this.db.dailyAggregates.filter((r) => r.scope === 'storefront');
    const totalVisitors = storefrontRecords.reduce((acc, r) => acc + r.visitors, 0);
    const todayVisitors = storefrontRecords
      .filter((r) => r.date === todayYmd)
      .reduce((acc, r) => acc + r.visitors, 0);
    let onlineNow = 0;
    for (const sess of this.activeSessions.values()) {
      if (sess.scope === 'storefront') onlineNow += 1;
    }
    return {
      totalVisitors,
      todayVisitors,
      onlineNow: Math.max(1, onlineNow),
    };
  }

  public getFinancialSummary(): FinancialSummaryResponse {
    const sales = [...(this.db.salesLedger || [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    const grossRevenue = Number(
      sales.reduce((acc, s) => acc + s.grossAmount, 0).toFixed(2),
    );
    const totalCommissions = Number(
      sales.reduce((acc, s) => acc + s.commissionAmount, 0).toFixed(2),
    );
    const netRevenue = Number((grossRevenue - totalCommissions).toFixed(2));
    const salesCount = sales.length;
    const averageTicket = salesCount > 0 ? Number((grossRevenue / salesCount).toFixed(2)) : 0;

    const avistaCount = sales.filter((s) => s.paymentPlan === 'avista').length;
    const installment2xCount = sales.filter((s) => s.paymentPlan === '2x').length;
    const installment3xCount = sales.filter((s) => s.paymentPlan === '3x').length;

    const sellerDefs: Array<{ sellerName: SellerName; roleLabel: string; commissionRate: number }> = [
      { sellerName: 'Francisco Araújo', roleLabel: 'Vendedor · Comissão 50%', commissionRate: 0.5 },
      { sellerName: 'Karina', roleLabel: 'Cunhada / Vendedora · Comissão 50%', commissionRate: 0.5 },
      { sellerName: 'Venda Direta', roleLabel: 'Canal Direto · Sem comissão', commissionRate: 0 },
    ];

    const sellers: SellerCommissionSummary[] = sellerDefs.map((def) => {
      const sellerSales = sales.filter((s) => s.sellerName === def.sellerName);
      return {
        sellerName: def.sellerName,
        roleLabel: def.roleLabel,
        commissionRate: def.commissionRate,
        salesCount: sellerSales.length,
        totalGross: Number(sellerSales.reduce((acc, s) => acc + s.grossAmount, 0).toFixed(2)),
        totalCommission: Number(sellerSales.reduce((acc, s) => acc + s.commissionAmount, 0).toFixed(2)),
      };
    });

    return {
      totals: {
        grossRevenue,
        totalCommissions,
        netRevenue,
        salesCount,
        averageTicket,
        avistaCount,
        installment2xCount,
        installment3xCount,
      },
      sellers,
      sales,
    };
  }

  public recordSale(input: {
    customerName: string;
    customerBusiness: string;
    itemName: string;
    paymentPlan: PaymentPlan;
    grossAmount: number;
    sellerName: SellerName;
    status?: 'Confirmada' | 'Pendente';
    orderCode?: string;
  }): SaleRecord {
    const safeGross = Number(Math.max(1, Number(input.grossAmount) || 350).toFixed(2));
    const validPlan: PaymentPlan =
      input.paymentPlan === '2x' || input.paymentPlan === '3x' ? input.paymentPlan : 'avista';
    const validSeller: SellerName =
      input.sellerName === 'Karina' || input.sellerName === 'Venda Direta'
        ? input.sellerName
        : 'Francisco Araújo';

    const commissionRate = validSeller === 'Venda Direta' ? 0 : 0.5;
    const commissionAmount = Number((safeGross * commissionRate).toFixed(2));
    const netAmount = Number((safeGross - commissionAmount).toFixed(2));
    const sellerRole =
      validSeller === 'Karina'
        ? 'Cunhada'
        : validSeller === 'Francisco Araújo'
          ? 'Vendedor'
          : 'Canal Direto';

    const record: SaleRecord = {
      id: `sale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderCode: input.orderCode || `VAA-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      customerName: String(input.customerName || 'Cliente').trim().slice(0, 80),
      customerBusiness: String(input.customerBusiness || 'Estabelecimento').trim().slice(0, 100),
      itemName: String(input.itemName || 'Aplicativo VitrineApkAc').trim().slice(0, 180),
      paymentPlan: validPlan,
      installmentLabel: resolveInstallmentLabel(validPlan, safeGross),
      grossAmount: safeGross,
      sellerName: validSeller,
      sellerRole,
      commissionRate,
      commissionAmount,
      netAmount,
      status: input.status === 'Pendente' ? 'Pendente' : 'Confirmada',
    };

    if (!Array.isArray(this.db.salesLedger)) {
      this.db.salesLedger = [];
    }
    this.db.salesLedger.unshift(record);
    this.evaluateAlertRules(false);
    this.saveDatabase();
    this.notify();
    return record;
  }

  public toggleSaleStatus(saleId: string): SaleRecord | null {
    const sale = (this.db.salesLedger || []).find((s) => s.id === saleId);
    if (!sale) return null;
    sale.status = sale.status === 'Confirmada' ? 'Pendente' : 'Confirmada';
    this.saveDatabase();
    this.notify();
    return sale;
  }

  private getCurrentAlertMetrics(): AlertsOverviewResponse['currentMetrics'] {
    const todayYmd = formatDateYMD(new Date());
    const monthStartYmd = formatDateYMD(addDays(new Date(), -29));

    const visitorsToday = this.db.dailyAggregates
      .filter((r) => r.date === todayYmd)
      .reduce((acc, r) => acc + r.visitors, 0);

    const visitorsTotal = this.db.dailyAggregates
      .filter((r) => r.date >= monthStartYmd && r.date <= todayYmd)
      .reduce((acc, r) => acc + r.visitors, 0);

    const sales = this.db.salesLedger || [];
    const salesCount = sales.length;
    const salesRevenue = Number(sales.reduce((acc, s) => acc + s.grossAmount, 0).toFixed(2));

    return {
      visitorsToday,
      visitorsTotal,
      salesCount,
      salesRevenue,
    };
  }

  private formatMetricValue(metric: AlertMetricType, value: number): string {
    if (metric === 'sales_revenue') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (metric === 'sales_count') {
      return `${value.toLocaleString('pt-BR')} vendas`;
    }
    return `${value.toLocaleString('pt-BR')} visitantes`;
  }

  private evaluateAlertRules(persistImmediately = true): AlertNotification[] {
    if (!Array.isArray(this.db.alertRules)) this.db.alertRules = [];
    if (!Array.isArray(this.db.alertNotifications)) this.db.alertNotifications = [];

    const metrics = this.getCurrentAlertMetrics();
    const newlyTriggered: AlertNotification[] = [];
    const nowIso = new Date().toISOString();

    for (const rule of this.db.alertRules) {
      if (!rule.enabled || rule.lastTriggeredAt) continue;

      let actualValue = 0;
      if (rule.metric === 'visitors_today') actualValue = metrics.visitorsToday;
      else if (rule.metric === 'visitors_total') actualValue = metrics.visitorsTotal;
      else if (rule.metric === 'sales_count') actualValue = metrics.salesCount;
      else if (rule.metric === 'sales_revenue') actualValue = metrics.salesRevenue;

      if (actualValue >= rule.threshold) {
        rule.lastTriggeredAt = nowIso;
        const notification: AlertNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ruleId: rule.id,
          title: rule.title,
          message: `Meta de ${this.formatMetricValue(rule.metric, rule.threshold)} atingida (atual: ${this.formatMetricValue(rule.metric, actualValue)}).`,
          metric: rule.metric,
          threshold: rule.threshold,
          actualValue,
          triggeredAt: nowIso,
          read: false,
        };
        this.db.alertNotifications.unshift(notification);
        newlyTriggered.push(notification);
      }
    }

    if (this.db.alertNotifications.length > 50) {
      this.db.alertNotifications = this.db.alertNotifications.slice(0, 50);
    }

    if (newlyTriggered.length > 0) {
      if (persistImmediately) {
        this.saveDatabase();
      }
      for (const notif of newlyTriggered) {
        this.notifyAlert(notif);
      }
    }

    return newlyTriggered;
  }

  public getAlertsOverview(): AlertsOverviewResponse {
    const rules = [...(this.db.alertRules || [])];
    const notifications = [...(this.db.alertNotifications || [])];
    const unreadCount = notifications.filter((n) => !n.read).length;
    return {
      rules,
      notifications,
      unreadCount,
      currentMetrics: this.getCurrentAlertMetrics(),
    };
  }

  public createAlertRule(input: {
    title: string;
    metric: AlertMetricType;
    threshold: number;
    enabled?: boolean;
    notifyInUi?: boolean;
  }): { rule: AlertRule; triggeredNotification: AlertNotification | null; overview: AlertsOverviewResponse } {
    if (!Array.isArray(this.db.alertRules)) this.db.alertRules = [];
    const safeThreshold = Math.max(1, Number(input.threshold) || 1);
    const validMetric: AlertMetricType =
      input.metric === 'visitors_total' ||
      input.metric === 'sales_count' ||
      input.metric === 'sales_revenue'
        ? input.metric
        : 'visitors_today';

    const rule: AlertRule = {
      id: `alert-rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: String(input.title || 'Nova meta monitorada').trim().slice(0, 120),
      metric: validMetric,
      threshold: safeThreshold,
      enabled: input.enabled !== false,
      notifyInUi: input.notifyInUi !== false,
      createdAt: new Date().toISOString(),
      lastTriggeredAt: null,
    };

    this.db.alertRules.unshift(rule);
    const triggered = this.evaluateAlertRules(false);
    this.saveDatabase();
    this.notify();

    return {
      rule,
      triggeredNotification: triggered.find((t) => t.ruleId === rule.id) || null,
      overview: this.getAlertsOverview(),
    };
  }

  public updateAlertRule(
    id: string,
    patch: Partial<Pick<AlertRule, 'title' | 'metric' | 'threshold' | 'enabled' | 'notifyInUi'>>,
  ): { rule: AlertRule | null; overview: AlertsOverviewResponse } {
    const rule = (this.db.alertRules || []).find((r) => r.id === id);
    if (!rule) {
      return { rule: null, overview: this.getAlertsOverview() };
    }

    if (typeof patch.title === 'string' && patch.title.trim()) {
      rule.title = patch.title.trim().slice(0, 120);
    }
    if (
      patch.metric === 'visitors_today' ||
      patch.metric === 'visitors_total' ||
      patch.metric === 'sales_count' ||
      patch.metric === 'sales_revenue'
    ) {
      rule.metric = patch.metric;
      rule.lastTriggeredAt = null;
    }
    if (typeof patch.threshold === 'number' && !Number.isNaN(patch.threshold) && patch.threshold > 0) {
      if (patch.threshold !== rule.threshold) {
        rule.lastTriggeredAt = null;
      }
      rule.threshold = patch.threshold;
    }
    if (typeof patch.enabled === 'boolean') {
      rule.enabled = patch.enabled;
    }
    if (typeof patch.notifyInUi === 'boolean') {
      rule.notifyInUi = patch.notifyInUi;
    }

    this.evaluateAlertRules(false);
    this.saveDatabase();
    this.notify();

    return {
      rule,
      overview: this.getAlertsOverview(),
    };
  }

  public resetAlertRule(id: string): AlertsOverviewResponse {
    const rule = (this.db.alertRules || []).find((r) => r.id === id);
    if (rule) {
      rule.lastTriggeredAt = null;
      rule.enabled = true;
      this.evaluateAlertRules(false);
      this.saveDatabase();
      this.notify();
    }
    return this.getAlertsOverview();
  }

  public deleteAlertRule(id: string): AlertsOverviewResponse {
    this.db.alertRules = (this.db.alertRules || []).filter((r) => r.id !== id);
    this.saveDatabase();
    this.notify();
    return this.getAlertsOverview();
  }

  public markNotificationRead(id: string): AlertsOverviewResponse {
    const notif = (this.db.alertNotifications || []).find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveDatabase();
      this.notify();
    }
    return this.getAlertsOverview();
  }

  public markAllNotificationsRead(): AlertsOverviewResponse {
    for (const notif of this.db.alertNotifications || []) {
      notif.read = true;
    }
    this.saveDatabase();
    this.notify();
    return this.getAlertsOverview();
  }

  public clearReadNotifications(): AlertsOverviewResponse {
    this.db.alertNotifications = (this.db.alertNotifications || []).filter((n) => !n.read);
    this.saveDatabase();
    this.notify();
    return this.getAlertsOverview();
  }
}

export const analyticsStore = new AnalyticsStore();
