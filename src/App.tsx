import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, LogOut, Shield, Bell, X, Check } from 'lucide-react';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AdminLoginView } from './components/AdminLoginView';
import { AdminQuotesView } from './components/AdminQuotesView';
import { AlertsConfigView } from './components/AlertsConfigView';
import { AppMonitoringView } from './components/AppMonitoringView';
import { FinancialDashboardView } from './components/FinancialDashboardView';
import { Header, type TopView } from './components/Header';
import { LgpdBanner } from './components/LgpdBanner';
import { PrivacyLgpdView } from './components/PrivacyLgpdView';
import { QuoteRequestView } from './components/QuoteRequestView';
import { StorefrontView, type CartItem } from './components/StorefrontView';
import { ThemeToggle, type ThemeMode } from './components/ThemeToggle';
import { TrackingSetupView } from './components/TrackingSetupView';
import type {
  ActiveSessionView,
  AlertNotification,
  AlertsOverviewResponse,
  AnalyticsScope,
  AnalyticsSummaryResponse,
  DateRangePreset,
  FinancialSummaryResponse,
  QuoteRequestRecord,
} from './types/analytics';
import {
  getConsentState,
  sendTrackingEvent,
  setConsentState,
} from './utils/tracker';

type AdminTab =
  | 'analytics'
  | 'financeiro'
  | 'orcamentos'
  | 'alertas'
  | 'aplicativos'
  | 'instalacao'
  | 'privacidade';

interface AdminUser {
  email: string;
  name: string;
}

const THEME_STORAGE_KEY = 'vitrine_apk_theme';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore storage restriction
  }
  return 'light';
}

function getTodayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function getDaysAgoYMD(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  // Public storefront is the default landing view; Analytics lives inside the authenticated Admin Dashboard
  const [activeView, setActiveView] = useState<TopView>('vitrine');
  const [adminTab, setAdminTab] = useState<AdminTab>('analytics');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [range, setRange] = useState<DateRangePreset>('7d');
  const [customStart, setCustomStart] = useState<string>(getDaysAgoYMD(14));
  const [customEnd, setCustomEnd] = useState<string>(getTodayYMD());
  const [scope, setScope] = useState<AnalyticsScope>('all');
  const [clientPortalAppId, setClientPortalAppId] = useState<string | null>(null);
  const [inspectedAppId, setInspectedAppId] = useState<string | null>(null);

  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [financial, setFinancial] = useState<FinancialSummaryResponse | null>(null);
  const [alertsOverview, setAlertsOverview] = useState<AlertsOverviewResponse | null>(null);
  const [quotesList, setQuotesList] = useState<QuoteRequestRecord[]>([]);
  const [toastAlerts, setToastAlerts] = useState<AlertNotification[]>([]);
  const [publicVisitorCount, setPublicVisitorCount] = useState<{
    totalVisitors: number;
    todayVisitors: number;
    onlineNow: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveSessions, setLiveSessions] = useState<ActiveSessionView[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const [showLgpdBanner, setShowLgpdBanner] = useState<boolean>(
    () => getConsentState() === 'pending',
  );

  // Sync theme preference to <html class="dark"> and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage restriction
    }
  }, [theme]);

  // Check if administrator session cookie is already active
  useEffect(() => {
    let active = true;
    fetch('/api/admin/me')
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; admin?: AdminUser }) => {
        if (!active) return;
        if (data.authenticated && data.admin) {
          setAdminUser(data.admin);
        } else {
          setAdminUser(null);
        }
      })
      .catch(() => {
        if (active) setAdminUser(null);
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!adminUser) return;
    setLoading((prev) => (summary ? prev : true));
    try {
      const qs = new URLSearchParams({
        range,
        scope,
      });
      if (range === 'custom') {
        qs.set('startDate', customStart);
        qs.set('endDate', customEnd);
      }
      if (clientPortalAppId) {
        qs.set('appId', clientPortalAppId);
        qs.set('clientMode', 'true');
      }
      const res = await fetch(`/api/analytics/summary?${qs.toString()}`);
      if (res.status === 401) {
        setAdminUser(null);
        setSummary(null);
        return;
      }
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setErrorMsg(err.error || 'Falha ao carregar estatísticas.');
        return;
      }
      const data = (await res.json()) as AnalyticsSummaryResponse;
      setSummary(data);
      setLiveSessions(data.activeSessions);
      setErrorMsg(null);
    } catch {
      setErrorMsg('Não foi possível conectar ao servidor de analytics.');
    } finally {
      setLoading(false);
    }
  }, [adminUser, range, customStart, customEnd, scope, clientPortalAppId, summary]);

  const fetchPublicVisitorCount = useCallback(async () => {
    try {
      const res = await fetch('/api/public/visitor-count');
      if (res.ok) {
        const data = (await res.json()) as {
          totalVisitors: number;
          todayVisitors: number;
          onlineNow: number;
        };
        setPublicVisitorCount(data);
      }
    } catch {
      // ignore transient network failure
    }
  }, []);

  const fetchFinancial = useCallback(async () => {
    if (!adminUser) return;
    try {
      const res = await fetch('/api/admin/financial');
      if (res.status === 401) {
        setAdminUser(null);
        setFinancial(null);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as FinancialSummaryResponse;
        setFinancial(data);
      }
    } catch {
      // ignore transient fetch failure
    }
  }, [adminUser]);

  const fetchAlerts = useCallback(async () => {
    if (!adminUser) return;
    try {
      const res = await fetch('/api/admin/alerts');
      if (res.status === 401) {
        setAdminUser(null);
        setAlertsOverview(null);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as AlertsOverviewResponse;
        setAlertsOverview(data);
      }
    } catch {
      // ignore transient fetch failure
    }
  }, [adminUser]);

  const fetchQuotes = useCallback(async () => {
    if (!adminUser) return;
    try {
      const res = await fetch('/api/admin/quotes');
      if (res.status === 401) {
        setAdminUser(null);
        setQuotesList([]);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { quotes: QuoteRequestRecord[] };
        setQuotesList(data.quotes || []);
      }
    } catch {
      // ignore transient fetch failure
    }
  }, [adminUser]);

  const pushToastAlert = useCallback((notif: AlertNotification) => {
    setToastAlerts((prev) => {
      if (prev.some((item) => item.id === notif.id)) return prev;
      return [notif, ...prev].slice(0, 3);
    });
  }, []);

  useEffect(() => {
    if (adminUser && activeView === 'admin') {
      fetchSummary();
      fetchFinancial();
      fetchAlerts();
      fetchQuotes();
    }
  }, [adminUser, activeView, fetchSummary, fetchFinancial, fetchAlerts, fetchQuotes]);

  // Automatic visitor pageview + 15s heartbeat + public visitor counter refresh on storefront
  useEffect(() => {
    fetchPublicVisitorCount();
    if (activeView !== 'vitrine') return;

    sendTrackingEvent({
      trackingId: 'VAA-SITE',
      scope: 'storefront',
      eventType: 'pageview',
      page: '/vitrine',
    }).then(() => {
      fetchPublicVisitorCount();
    });

    const interval = setInterval(() => {
      sendTrackingEvent({
        trackingId: 'VAA-SITE',
        scope: 'storefront',
        eventType: 'heartbeat',
        page: '/vitrine',
      });
      fetchPublicVisitorCount();
    }, 15_000);

    return () => clearInterval(interval);
  }, [activeView, fetchPublicVisitorCount]);

  // Real-time WebSocket stream ONLY connects when administrator is authenticated
  useEffect(() => {
    if (!adminUser) {
      setWsConnected(false);
      setLiveSessions([]);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/analytics`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByEffect = false;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = (ev) => {
        setWsConnected(false);
        if (!closedByEffect && ev.code !== 4401) {
          reconnectTimer = setTimeout(connect, 4000);
        }
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            activeSessions?: ActiveSessionView[];
            notification?: AlertNotification;
            overview?: AlertsOverviewResponse;
          };
          if (msg.activeSessions) {
            setLiveSessions(msg.activeSessions);
          }
          if (msg.type === 'analytics:update') {
            fetchSummary();
            fetchFinancial();
            fetchAlerts();
            fetchQuotes();
          }
          if (msg.type === 'alert:triggered' && msg.notification) {
            if (msg.overview) {
              setAlertsOverview(msg.overview);
            } else {
              fetchAlerts();
            }
            pushToastAlert(msg.notification);
          }
        } catch {
          // ignore malformed frames
        }
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [adminUser, fetchSummary, fetchFinancial, fetchAlerts, fetchQuotes, pushToastAlert]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAdminUser(null);
    setSummary(null);
    setFinancial(null);
    setAlertsOverview(null);
    setQuotesList([]);
    setToastAlerts([]);
    setLiveSessions([]);
    setClientPortalAppId(null);
    setActiveView('vitrine');
  };

  const handleNavigateVitrine = (anchorId?: string) => {
    setActiveView('vitrine');
    if (anchorId) {
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, quantity: p.quantity + delta } : p))
        .filter((p) => p.quantity > 0),
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header
        activeView={activeView}
        isAdminAuthenticated={Boolean(adminUser)}
        onNavigateVitrine={handleNavigateVitrine}
        onOpenQuote={() => {
          setActiveView('orcamento');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAdmin={() => setActiveView('admin')}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'vitrine' ? (
          <StorefrontView
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateQty={handleUpdateQty}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={() => setCart([])}
            cartOpen={cartOpen}
            onSetCartOpen={setCartOpen}
            theme={theme}
            onChangeTheme={setTheme}
            visitorCount={publicVisitorCount}
            onOrderRecorded={() => {
              fetchPublicVisitorCount();
              if (adminUser) fetchFinancial();
            }}
          />
        ) : activeView === 'orcamento' ? (
          <QuoteRequestView
            theme={theme}
            onChangeTheme={setTheme}
            onBackToStore={() => handleNavigateVitrine()}
            onQuoteSubmitted={() => {
              if (adminUser) fetchQuotes();
            }}
          />
        ) : checkingAuth ? (
          <div className="max-w-md mx-auto py-16 px-4">
            <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
          </div>
        ) : !adminUser ? (
          <AdminLoginView
            onLoginSuccess={(admin) => {
              setAdminUser(admin);
              setAdminTab('analytics');
            }}
            onBackToStore={() => setActiveView('vitrine')}
          />
        ) : (
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Protected Admin Dashboard Internal Sub-Navigation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {(
                  [
                    { id: 'analytics', label: 'VitrineApkAc — Analytics' },
                    { id: 'financeiro', label: 'Dashboard Financeiro' },
                    {
                      id: 'orcamentos',
                      label:
                        quotesList.filter((q) => q.workflowStatus === 'Recebido').length > 0
                          ? `Orçamentos (${quotesList.filter((q) => q.workflowStatus === 'Recebido').length})`
                          : 'Orçamentos',
                    },
                    {
                      id: 'alertas',
                      label:
                        alertsOverview && alertsOverview.unreadCount > 0
                          ? `Alertas & Metas (${alertsOverview.unreadCount})`
                          : 'Alertas & Metas',
                    },
                    { id: 'aplicativos', label: 'Aplicativos' },
                    { id: 'instalacao', label: 'Rastreamento' },
                    { id: 'privacidade', label: 'Privacidade LGPD' },
                  ] as const
                ).map((tab) => {
                  const active = adminTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAdminTab(tab.id)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-slate-900 dark:bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                <ThemeToggle theme={theme} onChangeTheme={setTheme} />
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                  <span className="truncate max-w-[200px]">{adminUser.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigateVitrine()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Voltar à Vitrine</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sair do Admin</span>
                </button>
              </div>
            </div>

            {alertsOverview && alertsOverview.unreadCount > 0 && adminTab !== 'alertas' && (
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-blue-950 dark:text-blue-100">
                  <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">
                      {alertsOverview.unreadCount}{' '}
                      {alertsOverview.unreadCount === 1
                        ? 'meta atingida com notificação pendente'
                        : 'metas atingidas com notificações pendentes'}
                      :
                    </span>{' '}
                    {alertsOverview.notifications.find((n) => !n.read)?.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminTab('alertas')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Abrir Alertas & Metas
                </button>
              </div>
            )}

            {loading && !summary ? (
              <div className="space-y-4">
                <div className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ) : errorMsg ? (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl p-6 text-sm text-red-800 dark:text-red-300 flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => {
                    setClientPortalAppId(null);
                    fetchSummary();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer"
                >
                  Recarregar
                </button>
              </div>
            ) : summary ? (
              <>
                {adminTab === 'analytics' && (
                  <AdminDashboardView
                    summary={summary}
                    liveSessions={liveSessions}
                    wsConnected={wsConnected}
                    range={range}
                    customStart={customStart}
                    customEnd={customEnd}
                    scope={scope}
                    clientPortalAppId={clientPortalAppId}
                    onChangeRange={setRange}
                    onChangeCustomDates={(s, e) => {
                      setCustomStart(s);
                      setCustomEnd(e);
                    }}
                    onChangeScope={setScope}
                    onSelectClientPortal={setClientPortalAppId}
                    onInspectApp={(appId) => {
                      setInspectedAppId(appId);
                      setAdminTab('aplicativos');
                    }}
                  />
                )}

                {adminTab === 'financeiro' && (
                  <FinancialDashboardView
                    financial={financial}
                    onRefresh={() => {
                      fetchFinancial();
                      fetchAlerts();
                    }}
                  />
                )}

                {adminTab === 'orcamentos' && (
                  <AdminQuotesView
                    quotes={quotesList}
                    onRefresh={fetchQuotes}
                  />
                )}

                {adminTab === 'alertas' && (
                  <AlertsConfigView
                    overview={alertsOverview}
                    onUpdated={(next) => setAlertsOverview(next)}
                    onImmediateNotification={(notif) => pushToastAlert(notif)}
                  />
                )}

                {adminTab === 'aplicativos' && (
                  <AppMonitoringView
                    summary={summary}
                    initialAppId={inspectedAppId}
                    onRefresh={fetchSummary}
                    onOpenClientPortal={(appId) => {
                      setClientPortalAppId(appId);
                      setAdminTab('analytics');
                    }}
                    onBackToAnalytics={() => setAdminTab('analytics')}
                  />
                )}

                {adminTab === 'instalacao' && (
                  <TrackingSetupView onVerified={fetchSummary} />
                )}

                {adminTab === 'privacidade' && (
                  <PrivacyLgpdView
                    settings={summary.privacySettings}
                    onUpdated={fetchSummary}
                  />
                )}
              </>
            ) : null}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              © 2026 VitrineApkAc — Todos os direitos reservados.
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              Web Desenvolvedor: <span className="font-medium text-slate-800 dark:text-slate-200">Francisco Araújo - (68) 99282-7744</span> · Ano 11/2026
            </div>
            {publicVisitorCount && (
              <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Contador de visitantes: <span className="font-semibold text-slate-800 dark:text-slate-200">{publicVisitorCount.totalVisitors.toLocaleString('pt-BR')}</span> acessos ({publicVisitorCount.todayVisitors.toLocaleString('pt-BR')} hoje)
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <ThemeToggle theme={theme} onChangeTheme={setTheme} />
            <button
              type="button"
              onClick={() => handleNavigateVitrine()}
              className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Vitrine Pública
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('orcamento');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Pedir Orçamento
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Acesso Administrativo
            </button>
          </div>
        </div>
      </footer>

      {/* Real-time Admin UI Toast Notifications for Triggered Goals */}
      {adminUser && toastAlerts.length > 0 && (
        <div
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0"
          role="status"
          aria-live="polite"
        >
          {toastAlerts.map((notif) => (
            <div
              key={notif.id}
              className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-xl space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Meta Atingida</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastAlerts((prev) => prev.filter((item) => item.id !== notif.id))}
                  aria-label="Fechar notificação"
                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {notif.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                  {notif.message}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/alerts/notifications/${encodeURIComponent(notif.id)}/read`, {
                      method: 'POST',
                    });
                    setToastAlerts((prev) => prev.filter((item) => item.id !== notif.id));
                    fetchAlerts();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Marcar lida</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('admin');
                    setAdminTab('alertas');
                    setToastAlerts((prev) => prev.filter((item) => item.id !== notif.id));
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-md cursor-pointer"
                >
                  Ver alertas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LgpdBanner
        visible={showLgpdBanner}
        onAcceptAll={() => {
          setConsentState('accepted');
          setShowLgpdBanner(false);
        }}
        onEssentialOnly={() => {
          setConsentState('essential');
          setShowLgpdBanner(false);
        }}
        onOpenPrivacy={() => {
          setShowLgpdBanner(false);
          setActiveView('admin');
          setAdminTab('privacidade');
        }}
      />
    </div>
  );
}
