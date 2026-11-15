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
import { APP_CATALOG, HERO_IMAGE_URL, STORE_ADDONS } from '../data/catalog';
import type { AppCatalogItem } from '../types/analytics';
import { sendTrackingEvent } from '../utils/tracker';

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
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  cartOpen,
  onSetCartOpen,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [previewApp, setPreviewApp] = useState<AppCatalogItem | null>(null);
  const [activePreviewFeature, setActivePreviewFeature] = useState<string>('');
  const [quoteSubmittedFor, setQuoteSubmittedFor] = useState<string | null>(null);
  const [orderConfirmedCode, setOrderConfirmedCode] = useState<string | null>(null);
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutBusiness, setCheckoutBusiness] = useState('');
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

  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    await Promise.all(
      cart.map((item) =>
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
    );

    const code = `VAA-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrderConfirmedCode(code);
    onClearCart();
    setCheckoutName('');
    setCheckoutBusiness('');
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="space-y-14 pb-16">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="text-xs font-medium text-blue-700 tracking-wide">
              VitrineApkAc · Aplicativos Personalizados para Negócios Locais
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-[1.12] [text-wrap:balance]">
              Aplicativos prontos para publicar com a marca do seu negócio
            </h1>
            <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
              Explore modelos prontos para barbearias, salões, confeitarias e serviços locais. Teste as funcionalidades ao vivo, personalize seu aplicativo e solicite publicação rápida.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#catalogo-apps"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>Explorar Aplicativos</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="#modulos-vitrine"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>Módulos e Publicação</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-64 sm:h-80 lg:h-full min-h-[280px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
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
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Catálogo de Aplicativos Personalizáveis
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Teste cada modelo ao vivo para registrar acessos individuais por identificador exclusivo.
            </p>
          </div>

          {/* Interactive category filter controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
            {categories.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
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
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-[4/3] bg-slate-100 border-b border-slate-200 overflow-hidden">
                <img
                  src={app.imageUrl}
                  alt={`Prévia do aplicativo ${app.name}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{app.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{app.trackingId}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{app.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{app.tagline}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="font-mono tabular-nums text-base font-semibold text-slate-900">
                    R$ {formatBRL(app.price)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAppPreview(app)}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Testar App
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAppToCart(app)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Módulos Complementares da Loja VitrineApkAc
          </h2>
          <p className="text-sm text-slate-600 mt-1 mb-6">
            Serviços adicionais contabilizados separadamente no funil da loja principal (código VAA-SITE).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STORE_ADDONS.map((addon) => (
              <div
                key={addon.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500">
                    {addon.category} · Loja VitrineApkAc
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{addon.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{addon.summary}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                    R$ {formatBRL(addon.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddAddonToCart(addon)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive App Simulator Modal (Generates real per-app telemetry!) */}
      {previewApp && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Simulação do aplicativo ${previewApp.name}`}
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12">
            {/* Left side: simulated mobile screen */}
            <div className="md:col-span-5 bg-slate-900 text-white p-5 flex flex-col justify-between">
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
                      Explore as telas e recursos disponíveis no aplicativo {previewApp.name} antes de solicitar sua personalização.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
                © 2026 VitrineApkAc · Web Desenvolvedor: Francisco Araujo (kikomelodoAcre) · 11/2026
              </div>
            </div>

            {/* Right side: details & feature testing */}
            <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      {previewApp.category} · Código {previewApp.trackingId}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {previewApp.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeAppPreview}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                    aria-label="Fechar prévia do aplicativo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  {previewApp.description}
                </p>

                <div className="mt-5">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
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
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {feat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Licença personalizável</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    R$ {formatBRL(previewApp.price)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestQuote(previewApp)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {quoteSubmittedFor === previewApp.id ? 'Solicitação registrada' : 'Solicitar Orçamento'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddAppToCart(previewApp);
                      closeAppPreview();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Carrinho de compras"
        >
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between border-l border-slate-200 shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-700" aria-hidden="true" />
                <h3 className="text-base font-bold text-slate-900">Seu Carrinho</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSetCartOpen(false);
                  setOrderConfirmedCode(null);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                aria-label="Fechar carrinho"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {orderConfirmedCode ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <Check className="w-5 h-5" aria-hidden="true" />
                    <span>Pedido {orderConfirmedCode} confirmado</span>
                  </div>
                  <p className="text-xs text-emerald-900/80 leading-relaxed">
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
                  <p className="text-sm font-medium text-slate-700">Seu carrinho está vazio</p>
                  <p className="text-xs text-slate-500">
                    Adicione um aplicativo ou módulo para testar o rastreamento de carrinho e conversão.
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            R$ {formatBRL(item.price)} · {item.trackingId}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="inline-flex items-center border border-slate-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.id, -1)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                              aria-label="Diminuir quantidade"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-xs font-mono tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.id, 1)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                              aria-label="Aumentar quantidade"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveFromCart(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            aria-label="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form id="checkout-form" onSubmit={handleCompletePurchase} className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Identificação do pedido (dados não enviados ao módulo de analytics)
                    </div>
                    <input
                      type="text"
                      required
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      placeholder="Nome do responsável"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-2 focus:outline-blue-600"
                    />
                    <input
                      type="text"
                      required
                      value={checkoutBusiness}
                      onChange={(e) => setCheckoutBusiness(e.target.value)}
                      placeholder="Nome do estabelecimento"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-2 focus:outline-blue-600"
                    />
                  </form>
                </>
              )}
            </div>

            {cart.length > 0 && !orderConfirmedCode && (
              <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    R$ {formatBRL(cartSubtotal)}
                  </span>
                </div>
                <button
                  type="submit"
                  form="checkout-form"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
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
