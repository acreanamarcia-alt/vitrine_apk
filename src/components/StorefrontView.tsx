import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  APP_CATALOG,
  APP_INSTALLMENT_2X,
  APP_INSTALLMENT_3X,
  HERO_IMAGE_URL,
  SELLERS_CONFIG,
  STORE_ADDONS,
} from '../data/catalog';
import type { AppCatalogItem, PaymentPlan, SellerName } from '../types/analytics';
import { sendTrackingEvent } from '../utils/tracker';
import { ThemeToggle, type ThemeMode } from './ThemeToggle';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  scope: 'storefront' | 'app';
  trackingId: string;
  appId?: string;
}

interface StorefrontViewProps {
  cart: CartItem[];
  onAddToCart: (item: Omit<CartItem, 'quantity'>) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  cartOpen: boolean;
  onSetCartOpen: (open: boolean) => void;
  theme: ThemeMode;
  onChangeTheme: (next: ThemeMode) => void;
  visitorCount: { totalVisitors: number; todayVisitors: number; onlineNow: number } | null;
  onOrderRecorded?: () => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  cartOpen,
  onSetCartOpen,
  theme,
  onChangeTheme,
  visitorCount,
  onOrderRecorded,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [previewApp, setPreviewApp] = useState<AppCatalogItem | null>(null);
  const [activePreviewFeature, setActivePreviewFeature] = useState<string>('');
  const [quoteSubmittedFor, setQuoteSubmittedFor] = useState<string | null>(null);
  const [orderConfirmedCode, setOrderConfirmedCode] = useState<string | null>(null);
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutBusiness, setCheckoutBusiness] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('avista');
  const [sellerName, setSellerName] = useState<SellerName>('Francisco Araújo');
  const previewStartRef = useRef<number>(0);

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const categories = ['Todos', 'Beleza e Estética', 'Alimentação', 'Papelaria', 'Serviços Locais'];

  const filteredApps =
    categoryFilter === 'Todos'
      ? APP_CATALOG
      : APP_CATALOG.filter((a) => a.category === categoryFilter);

  const openAppPreview = (app: AppCatalogItem) => {
    setPreviewApp(app);
    setActivePreviewFeature(app.features[0] || '');
    setQuoteSubmittedFor(null);
    previewStartRef.current = Date.now();
    sendTrackingEvent({
      trackingId: app.trackingId,
      scope: 'app',
      eventType: 'app_view',
      page: `/app/${app.id}`,
      appId: app.id,
      productId: app.id,
      productName: app.name,
    });
  };

  const closeAppPreview = () => {
    if (previewApp && previewStartRef.current > 0) {
      const elapsedSec = Math.max(2, Math.round((Date.now() - previewStartRef.current) / 1000));
      sendTrackingEvent({
        trackingId: previewApp.trackingId,
        scope: 'app',
        eventType: 'duration_ping',
        page: `/app/${previewApp.id}`,
        appId: previewApp.id,
        durationSec: elapsedSec,
      });
    }
    setPreviewApp(null);
  };

  useEffect(() => {
    return () => {
      if (previewApp && previewStartRef.current > 0) {
        const elapsedSec = Math.max(2, Math.round((Date.now() - previewStartRef.current) / 1000));
        sendTrackingEvent({
          trackingId: previewApp.trackingId,
          scope: 'app',
          eventType: 'duration_ping',
          page: `/app/${previewApp.id}`,
          appId: previewApp.id,
          durationSec: elapsedSec,
        });
      }
    };
  }, [previewApp]);

  const handleFeatureClick = (app: AppCatalogItem, feature: string) => {
    setActivePreviewFeature(feature);
    sendTrackingEvent({
      trackingId: app.trackingId,
      scope: 'app',
      eventType: 'feature_click',
      page: `/app/${app.id}`,
      appId: app.id,
      featureName: feature,
    });
  };

  const handleRequestQuote = (app: AppCatalogItem) => {
    setQuoteSubmittedFor(app.id);
    sendTrackingEvent({
      trackingId: app.trackingId,
      scope: 'app',
      eventType: 'purchase_request',
      page: `/app/${app.id}`,
      appId: app.id,
      productId: app.id,
      productName: app.name,
    });
  };

  const handleAddAppToCart = (app: AppCatalogItem) => {
    onAddToCart({
      id: app.id,
      name: `${app.name} (${app.clientBusinessName})`,
      price: app.price,
      scope: 'app',
      trackingId: app.trackingId,
      appId: app.id,
    });
    sendTrackingEvent({
      trackingId: app.trackingId,
      scope: 'app',
      eventType: 'add_to_cart',
      page: `/app/${app.id}`,
      appId: app.id,
      productId: app.id,
      productName: app.name,
    });
    onSetCartOpen(true);
  };

  const handleAddAddonToCart = (addon: (typeof STORE_ADDONS)[number]) => {
    onAddToCart({
      id: addon.id,
      name: addon.name,
      price: addon.price,
      scope: 'storefront',
      trackingId: 'VAA-SITE',
    });
    sendTrackingEvent({
      trackingId: 'VAA-SITE',
      scope: 'storefront',
      eventType: 'add_to_cart',
      page: '/vitrine',
      productId: addon.id,
      productName: addon.name,
    });
    onSetCartOpen(true);
  };

  const cartAppCount = cart
    .filter((item) => item.scope === 'app')
    .reduce((acc, item) => acc + item.quantity, 0);

  const baseSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  // 3x installment for each R$ 350,00 app is 3x R$ 130,00 = R$ 390,00 (+R$ 40,00 per app)
  const cartTotal =
    paymentPlan === '3x' ? baseSubtotal + cartAppCount * (APP_INSTALLMENT_3X * 3 - 350) : baseSubtotal;

  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const code = `VAA-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemSummary = cart
      .map((i) => (i.quantity > 1 ? `${i.quantity}x ${i.name}` : i.name))
      .join(' + ');

    await Promise.all([
      ...cart.map((item) =>
        sendTrackingEvent({
          trackingId: item.trackingId,
          scope: item.scope,
          eventType: 'purchase',
          page: '/checkout',
          appId: item.appId,
          productId: item.id,
          productName: item.name,
        }),
      ),
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: checkoutName.trim(),
          customerBusiness: checkoutBusiness.trim(),
          itemName: itemSummary,
          paymentPlan,
          grossAmount: cartTotal,
          sellerName,
          orderCode: code,
        }),
      }),
    ]);

    setOrderConfirmedCode(code);
    onClearCart();
    setCheckoutName('');
    setCheckoutBusiness('');
    onOrderRecorded?.();
  };

  return (
    <div className="space-y-14 pb-16">
      {/* Hero Section */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400 tracking-wide">
                VitrineApkAc · Aplicativos Personalizados para Negócios Locais
              </div>
              <ThemeToggle theme={theme} onChangeTheme={onChangeTheme} />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.12] [text-wrap:balance]">
              Aplicativos prontos para publicar com a marca do seu negócio
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Explore modelos prontos para barbearias, salões, confeitarias e serviços locais. Teste as funcionalidades ao vivo, personalize seu aplicativo e solicite publicação rápida.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#catalogo-apps"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>Explorar Aplicativos</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="#modulos-vitrine"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>Módulos e Publicação</span>
              </a>
              {visitorCount && (
                <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 pl-1">
                  Visitantes: <span className="font-semibold text-slate-800 dark:text-slate-200">{visitorCount.totalVisitors.toLocaleString('pt-BR')}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Hoje: {visitorCount.todayVisitors.toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-64 sm:h-80 lg:h-full min-h-[280px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <img
                src={HERO_IMAGE_URL}
                alt="Dispositivos exibindo aplicativos personalizáveis da VitrineApkAc"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main App Catalog Grid */}
      <section id="catalogo-apps" className="max-w-[1320px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Catálogo de Aplicativos Personalizáveis
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Teste cada modelo ao vivo para explorar recursos por segmento.
            </p>
          </div>

          {/* Interactive category filter controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg overflow-x-auto">
            {categories.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => (
            <article
              key={app.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-slate-950/60"
            >
              <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
                <img
                  src={app.imageUrl}
                  alt={`Prévia do ${app.name}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{app.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{app.trackingId}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{app.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{app.tagline}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono tabular-nums text-base font-semibold text-slate-900 dark:text-slate-100">
                      R$ {formatBRL(app.price)}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      2x R$ {formatBRL(APP_INSTALLMENT_2X)} ou 3x R$ {formatBRL(APP_INSTALLMENT_3X)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAppPreview(app)}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Testar App
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAppToCart(app)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Secondary Section: Módulos e Personalizações da Loja */}
      <section id="modulos-vitrine" className="max-w-[1320px] mx-auto px-4 sm:px-6">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Módulos Complementares da Loja VitrineApkAc
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-6">
            Serviços adicionais de domínio, identidade visual e integrações para seu aplicativo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STORE_ADDONS.map((addon) => (
              <div
                key={addon.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {addon.category} · Loja VitrineApkAc
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{addon.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{addon.summary}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 dark:text-slate-100">
                    R$ {formatBRL(addon.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddAddonToCart(addon)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive App Simulator Modal */}
      {previewApp && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Simulação do ${previewApp.name}`}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12">
            {/* Left side: simulated mobile screen */}
            <div className="md:col-span-5 bg-slate-900 dark:bg-slate-950 text-white p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span className="font-mono">{previewApp.trackingId}</span>
                  <span>Modo Demonstração</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-5 h-5 text-blue-400" aria-hidden="true" />
                    <div>
                      <div className="text-sm font-bold">{previewApp.clientBusinessName}</div>
                      <div className="text-xs text-slate-400">{previewApp.category}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-700 space-y-2">
                    <div className="text-xs text-slate-400">Funcionalidade selecionada:</div>
                    <div className="text-sm font-semibold text-white bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2">
                      {activePreviewFeature}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Explore as telas e recursos disponíveis no {previewApp.name} antes de solicitar sua personalização.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
                © 2026 VitrineApkAc · Web Desenvolvedor: Francisco Araújo - (68) 99282-7744 · 11/2026
              </div>
            </div>

            {/* Right side: details & feature testing */}
            <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {previewApp.category} · Código {previewApp.trackingId}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {previewApp.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeAppPreview}
                    className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    aria-label="Fechar prévia do aplicativo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                  {previewApp.description}
                </p>

                <div className="mt-5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Funcionalidades incluídas (clique para simular):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {previewApp.features.map((feat) => {
                      const active = activePreviewFeature === feat;
                      return (
                        <button
                          key={feat}
                          type="button"
                          onClick={() => handleFeatureClick(previewApp, feat)}
                          className={`text-left px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                            active
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {feat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Licença personalizável</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    R$ {formatBRL(previewApp.price)}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    ou 2x de R$ {formatBRL(APP_INSTALLMENT_2X)} · 3x de R$ {formatBRL(APP_INSTALLMENT_3X)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestQuote(previewApp)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {quoteSubmittedFor === previewApp.id ? 'Solicitação registrada' : 'Solicitar Orçamento'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddAppToCart(previewApp);
                      closeAppPreview();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Comprar este App
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Cart & Checkout Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Carrinho de compras"
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Seu Carrinho</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSetCartOpen(false);
                  setOrderConfirmedCode(null);
                }}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Fechar carrinho"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {orderConfirmedCode ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                    <Check className="w-5 h-5" aria-hidden="true" />
                    <span>Pedido {orderConfirmedCode} confirmado</span>
                  </div>
                  <p className="text-xs text-emerald-900/80 dark:text-emerald-200/90 leading-relaxed">
                    Recebemos sua solicitação de pedido. Nossa equipe entrará em contato para iniciar a personalização do seu aplicativo.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onSetCartOpen(false);
                      setOrderConfirmedCode(null);
                    }}
                    className="w-full py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                  >
                    Continuar na Vitrine
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Seu carrinho está vazio</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Adicione um aplicativo ou módulo para solicitar a personalização.
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cart.map((item) => (
                      <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            R$ {formatBRL(item.price)} · {item.trackingId}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.id, -1)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              aria-label="Diminuir quantidade"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.id, 1)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              aria-label="Aumentar quantidade"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveFromCart(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            aria-label="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form id="checkout-form" onSubmit={handleCompletePurchase} className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Identificação do pedido
                    </div>
                    <input
                      type="text"
                      required
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      placeholder="Nome do responsável"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                    />
                    <input
                      type="text"
                      required
                      value={checkoutBusiness}
                      onChange={(e) => setCheckoutBusiness(e.target.value)}
                      placeholder="Nome do estabelecimento"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                    />

                    <div className="space-y-1.5 pt-1">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Forma de pagamento
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {(
                          [
                            {
                              id: 'avista',
                              label: 'À vista (R$ 350,00 por app)',
                            },
                            {
                              id: '2x',
                              label: `Parcelado em 2x de R$ ${formatBRL(cartTotal / 2)} (2x R$ 175,00/app)`,
                            },
                            {
                              id: '3x',
                              label: `Parcelado em 3x de R$ ${formatBRL(
                                (paymentPlan === '3x' ? cartTotal : baseSubtotal + cartAppCount * 40) / 3,
                              )} (3x R$ 130,00/app)`,
                            },
                          ] as const
                        ).map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border cursor-pointer transition-colors ${
                              paymentPlan === opt.id
                                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-semibold'
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentPlan"
                              checked={paymentPlan === opt.id}
                              onChange={() => setPaymentPlan(opt.id)}
                              className="accent-blue-700"
                            />
                            <span className="font-mono tabular-nums">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label htmlFor="checkout-seller" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Vendedor responsável (Comissão 50%)
                      </label>
                      <select
                        id="checkout-seller"
                        value={sellerName}
                        onChange={(e) => setSellerName(e.target.value as SellerName)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
                      >
                        {SELLERS_CONFIG.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </form>
                </>
              )}
            </div>

            {cart.length > 0 && !orderConfirmedCode && (
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Total ({paymentPlan === 'avista' ? 'À vista' : paymentPlan === '2x' ? '2x' : '3x'})
                  </span>
                  <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    R$ {formatBRL(cartTotal)}
                  </span>
                </div>
                {paymentPlan !== 'avista' && (
                  <div className="text-xs font-mono tabular-nums text-right text-slate-500 dark:text-slate-400">
                    {paymentPlan === '2x'
                      ? `2 parcelas de R$ ${formatBRL(cartTotal / 2)}`
                      : `3 parcelas de R$ ${formatBRL(cartTotal / 3)}`}
                  </div>
                )}
                <button
                  type="submit"
                  form="checkout-form"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  Finalizar Compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
