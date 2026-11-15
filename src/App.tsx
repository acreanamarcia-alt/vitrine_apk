import { useCallback, useEffect, useState } from 'react';
import { LogOut, Shield } from 'lucide-react';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AdminLoginView } from './components/AdminLoginView';
import { AppMonitoringView } from './components/AppMonitoringView';
import { Header, type TopView } from './components/Header';
import { LgpdBanner } from './components/LgpdBanner';
import { PrivacyLgpdView } from './components/PrivacyLgpdView';
import { StorefrontView, type CartItem } from './components/StorefrontView';
import { TrackingSetupView } from './components/TrackingSetupView';
import type {
  ActiveSessionView,
  AnalyticsScope,
  AnalyticsSummaryResponse,
  DateRangePreset,
} from './types/analytics';
import {
  getConsentState,
  sendTrackingEvent,
  setConsentState,
} from './utils/tracker';

type AdminTab = 'analytics' | 'aplicativos' | 'instalacao' | 'privacidade';

interface AdminUser {
  email: string;
  name: string;
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
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveSessions, setLiveSessions] = useState<ActiveSessionView[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const [showLgpdBanner, setShowLgpdBanner] = useState<boolean>(
    () => getConsentState() === 'pending',
  );

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

  useEffect(() => {
    if (adminUser && activeView === 'admin') {
      fetchSummary();
    }
  }, [adminUser, activeView, fetchSummary]);

  // Automatic visitor pageview + 15s heartbeat strictly on public storefront pages
  useEffect(() => {
    if (activeView !== 'vitrine') return;

    sendTrackingEvent({
      trackingId: 'VAA-SITE',
      scope: 'storefront',
      eventType: 'pageview',
      page: '/vitrine',
    });

    const interval = setInterval(() => {
      sendTrackingEvent({
        trackingId: 'VAA-SITE',
        scope: 'storefront',
        eventType: 'heartbeat',
        page: '/vitrine',
      });
    }, 15_000);

    return () => clearInterval(interval);
  }, [activeView]);

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
          };
          if (msg.activeSessions) {
            setLiveSessions(msg.activeSessions);
          }
          if (msg.type === 'analytics:update') {
            fetchSummary();
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
  }, [adminUser, fetchSummary]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAdminUser(null);
    setSummary(null);
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeView={activeView}
        isAdminAuthenticated={Boolean(adminUser)}
        onNavigateVitrine={handleNavigateVitrine}
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
          />
        ) : checkingAuth ? (
          <div className="max-w-md mx-auto py-16 px-4">
            <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
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
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {(
                  [
                    { id: 'analytics', label: 'VitrineApkAc — Analytics' },
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
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <Shield className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                  <span className="truncate max-w-[220px]">{adminUser.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sair do Admin</span>
                </button>
              </div>
            </div>

            {loading && !summary ? (
              <div className="space-y-4">
                <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ) : errorMsg ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-800 flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => {
                    setClientPortalAppId(null);
                    fetchSummary();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 rounded-lg cursor-pointer"
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

                {adminTab === 'aplicativos' && (
                  <AppMonitoringView
                    summary={summary}
                    initialAppId={inspectedAppId}
                    onRefresh={fetchSummary}
                    onOpenClientPortal={(appId) => {
                      setClientPortalAppId(appId);
                      setAdminTab('analytics');
                    }}
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

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">
              © 2026 VitrineApkAc — Todos os direitos reservados.
            </div>
            <div className="text-slate-500">
              Web Desenvolvedor: <span className="font-medium text-slate-800">Francisco Araujo (kikomelodoAcre)</span> · Ano 11/2026
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigateVitrine()}
              className="hover:text-slate-900 cursor-pointer"
            >
              Vitrine Pública
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Acesso Administrativo
            </button>
          </div>
        </div>
      </footer>

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
