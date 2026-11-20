import crypto from 'node:crypto';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { analyticsStore } from './src/server/analyticsStore';
import type {
  AlertMetricType,
  AnalyticsScope,
  DateRangePreset,
  PaymentPlan,
  SellerName,
  TrackEventPayload,
} from './src/types/analytics';

const ADMIN_COOKIE_NAME = 'vaa_admin_session';
const ADMIN_LOGIN = (process.env.ADMIN_LOGIN || process.env.ADMIN_EMAIL || 'vitrine.adm').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vintrine@2026';

interface AdminSession {
  token: string;
  email: string;
  name: string;
  createdAt: number;
  expiresAt: number;
}

const adminSessions = new Map<string, AdminSession>();

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) result[key] = val;
  }
  return result;
}

function getAuthenticatedAdmin(req: express.Request | http.IncomingMessage): AdminSession | null {
  const cookies = parseCookies(req.headers.cookie);
  let token = cookies[ADMIN_COOKIE_NAME];
  if (!token && typeof req.headers.authorization === 'string') {
    const auth = req.headers.authorization;
    if (auth.startsWith('Bearer ')) {
      token = auth.slice(7).trim();
    }
  }
  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return null;
  }
  return session;
}

function safeCompareString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/analytics' });

  app.use(express.json({ limit: '1mb' }));

  const requireAdminAuth: express.RequestHandler = (req, res, next) => {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      res.status(401).json({
        error: 'Acesso restrito. Faça login como administrador para visualizar dados sigilosos.',
      });
      return;
    }
    next();
  };

  // Broadcast real-time active session snapshot ONLY to authenticated admin dashboards
  const broadcastLiveUpdate = () => {
    const payload = JSON.stringify({
      type: 'analytics:update',
      onlineNow: analyticsStore.getActiveSessions().length,
      activeSessions: analyticsStore.getActiveSessions(),
      timestamp: new Date().toISOString(),
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  analyticsStore.subscribe(broadcastLiveUpdate);

  analyticsStore.subscribeAlerts((notification) => {
    const payload = JSON.stringify({
      type: 'alert:triggered',
      notification,
      overview: analyticsStore.getAlertsOverview(),
      timestamp: new Date().toISOString(),
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  });

  wss.on('connection', (ws, req) => {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      ws.close(4401, 'Acesso restrito ao administrador');
      return;
    }
    ws.send(
      JSON.stringify({
        type: 'analytics:init',
        onlineNow: analyticsStore.getActiveSessions().length,
        activeSessions: analyticsStore.getActiveSessions(),
        timestamp: new Date().toISOString(),
      }),
    );
  });

  // Admin authentication endpoints
  app.get('/api/admin/me', (req, res) => {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      res.json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      admin: {
        email: admin.email,
        name: admin.name,
      },
    });
  });

  app.post('/api/admin/login', (req, res) => {
    const { email, login, password } = (req.body || {}) as {
      email?: string;
      login?: string;
      password?: string;
    };
    const normalizedLogin = String(login || email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    if (!safeCompareString(normalizedLogin, ADMIN_LOGIN) || !safeCompareString(rawPassword, ADMIN_PASSWORD)) {
      res.status(401).json({
        error: 'Login ou senha de administrador inválidos.',
      });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const session: AdminSession = {
      token,
      email: ADMIN_LOGIN,
      name: 'Administrador VitrineApkAc',
      createdAt: now,
      expiresAt: now + 8 * 60 * 60 * 1000, // 8 hours
    };
    adminSessions.set(token, session);

    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
    );
    res.json({
      authenticated: true,
      admin: {
        email: session.email,
        name: session.name,
      },
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[ADMIN_COOKIE_NAME];
    if (token) {
      adminSessions.delete(token);
    }
    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
    res.json({ authenticated: false });
  });

  // Public storefront & app visitor tracking endpoint (writes anonymous telemetry only)
  app.post('/api/track', (req, res) => {
    const body = req.body as TrackEventPayload;
    if (!body || !body.sessionHash || !body.eventType) {
      res.status(400).json({ error: 'Payload de rastreamento inválido.' });
      return;
    }
    const result = analyticsStore.trackEvent(body);
    res.json(result);
  });

  // Public aggregate storefront visitor counter (non-confidential counter only)
  app.get('/api/public/visitor-count', (_req, res) => {
    res.json(analyticsStore.getPublicVisitorCount());
  });

  // Public checkout order persistence (records sale + seller 50% commission without exposing ledger)
  app.post('/api/orders', (req, res) => {
    const body = (req.body || {}) as {
      customerName?: string;
      customerBusiness?: string;
      itemName?: string;
      paymentPlan?: PaymentPlan;
      grossAmount?: number;
      sellerName?: SellerName;
      orderCode?: string;
    };
    if (!body.customerName || !body.itemName || !body.grossAmount) {
      res.status(400).json({ error: 'Dados do pedido incompletos.' });
      return;
    }
    const sale = analyticsStore.recordSale({
      customerName: body.customerName,
      customerBusiness: body.customerBusiness || 'Negócio Local',
      itemName: body.itemName,
      paymentPlan: body.paymentPlan || 'avista',
      grossAmount: Number(body.grossAmount),
      sellerName: body.sellerName || 'Francisco Araújo',
      orderCode: body.orderCode,
      status: 'Confirmada',
    });
    res.status(201).json({ ok: true, orderCode: sale.orderCode });
  });

  // Confidential Financial Dashboard endpoints — strictly protected by requireAdminAuth
  app.get('/api/admin/financial', requireAdminAuth, (_req, res) => {
    res.json(analyticsStore.getFinancialSummary());
  });

  app.post('/api/admin/financial/sales', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as {
      customerName?: string;
      customerBusiness?: string;
      itemName?: string;
      paymentPlan?: PaymentPlan;
      grossAmount?: number;
      sellerName?: SellerName;
      status?: 'Confirmada' | 'Pendente';
    };
    if (!body.customerName || !body.itemName || !body.grossAmount) {
      res.status(400).json({ error: 'Preencha cliente, produto e valor da venda.' });
      return;
    }
    const sale = analyticsStore.recordSale({
      customerName: body.customerName,
      customerBusiness: body.customerBusiness || 'Estabelecimento',
      itemName: body.itemName,
      paymentPlan: body.paymentPlan || 'avista',
      grossAmount: Number(body.grossAmount),
      sellerName: body.sellerName || 'Francisco Araújo',
      status: body.status || 'Confirmada',
    });
    res.status(201).json({
      sale,
      summary: analyticsStore.getFinancialSummary(),
    });
  });

  app.patch('/api/admin/financial/sales/:id/toggle', requireAdminAuth, (req, res) => {
    const updated = analyticsStore.toggleSaleStatus(req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'Venda não encontrada.' });
      return;
    }
    res.json({
      sale: updated,
      summary: analyticsStore.getFinancialSummary(),
    });
  });

  // Confidential Admin Alerts & Goal Notifications endpoints
  app.get('/api/admin/alerts', requireAdminAuth, (_req, res) => {
    res.json(analyticsStore.getAlertsOverview());
  });

  app.post('/api/admin/alerts/rules', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as {
      title?: string;
      metric?: AlertMetricType;
      threshold?: number;
      enabled?: boolean;
      notifyInUi?: boolean;
    };
    if (!body.title || !body.metric || !body.threshold) {
      res.status(400).json({ error: 'Informe título, métrica e valor da meta.' });
      return;
    }
    const result = analyticsStore.createAlertRule({
      title: body.title,
      metric: body.metric,
      threshold: Number(body.threshold),
      enabled: body.enabled,
      notifyInUi: body.notifyInUi,
    });
    res.status(201).json(result);
  });

  app.patch('/api/admin/alerts/rules/:id', requireAdminAuth, (req, res) => {
    const result = analyticsStore.updateAlertRule(req.params.id, req.body || {});
    if (!result.rule) {
      res.status(404).json({ error: 'Regra de alerta não encontrada.' });
      return;
    }
    res.json(result);
  });

  app.post('/api/admin/alerts/rules/:id/rearm', requireAdminAuth, (req, res) => {
    const overview = analyticsStore.resetAlertRule(req.params.id);
    res.json(overview);
  });

  app.delete('/api/admin/alerts/rules/:id', requireAdminAuth, (req, res) => {
    const overview = analyticsStore.deleteAlertRule(req.params.id);
    res.json(overview);
  });

  app.post('/api/admin/alerts/notifications/:id/read', requireAdminAuth, (req, res) => {
    const overview = analyticsStore.markNotificationRead(req.params.id);
    res.json(overview);
  });

  app.post('/api/admin/alerts/notifications/read-all', requireAdminAuth, (_req, res) => {
    const overview = analyticsStore.markAllNotificationsRead();
    res.json(overview);
  });

  app.delete('/api/admin/alerts/notifications/read', requireAdminAuth, (_req, res) => {
    const overview = analyticsStore.clearReadNotifications();
    res.json(overview);
  });

  // Confidential Analytics endpoints — strictly protected by requireAdminAuth
  app.get('/api/analytics/summary', requireAdminAuth, (req, res) => {
    const range = (req.query.range as DateRangePreset) || '7d';
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const scope = (req.query.scope as AnalyticsScope) || 'all';
    const appId = (req.query.appId as string) || null;
    const clientMode = req.query.clientMode === 'true';

    const summary = analyticsStore.getSummary({
      range,
      startDate,
      endDate,
      scope,
      appId,
      clientMode,
    });

    if (clientMode && appId) {
      const targetApp = summary.topApps.find((a) => a.appId === appId);
      if (targetApp && !targetApp.clientPortalEnabled) {
        res.status(403).json({
          error: 'O acesso às estatísticas individuais não está habilitado para este cliente.',
        });
        return;
      }
    }

    res.json(summary);
  });

  app.post('/api/analytics/app-permissions', requireAdminAuth, (req, res) => {
    const { appId, clientPortalEnabled } = req.body as { appId: string; clientPortalEnabled: boolean };
    const updated = analyticsStore.updateAppPermission(appId, Boolean(clientPortalEnabled));
    if (!updated) {
      res.status(404).json({ error: 'Aplicativo não encontrado.' });
      return;
    }
    res.json(updated);
  });

  app.post('/api/analytics/privacy', requireAdminAuth, (req, res) => {
    const updated = analyticsStore.updatePrivacySettings(req.body);
    res.json(updated);
  });

  app.post('/api/analytics/purge', requireAdminAuth, (req, res) => {
    const { onlyBaseline } = (req.body || {}) as { onlyBaseline?: boolean };
    const result = analyticsStore.purgeByRetention(Boolean(onlyBaseline));
    res.json(result);
  });

  app.post('/api/analytics/verify-snippet', requireAdminAuth, (req, res) => {
    const { trackingId, appId } = req.body as { trackingId: string; appId?: string };
    const isApp = Boolean(appId && trackingId !== 'VAA-SITE');
    const result = analyticsStore.trackEvent({
      sessionHash: `verify_${Math.random().toString(36).slice(2, 8)}`,
      trackingId: trackingId || 'VAA-SITE',
      scope: isApp ? 'app' : 'storefront',
      eventType: isApp ? 'app_view' : 'pageview',
      page: isApp ? `/app/${appId}` : '/vitrine',
      appId: isApp ? appId : undefined,
      deviceType: 'desktop',
      source: 'direct',
      consentGiven: true,
    });
    res.json({
      verified: true,
      trackingId,
      receivedAt: result.recordedAt,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`VitrineApkAc server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
