import React, { useState } from 'react';
import { Check, Code2, Copy, Send } from 'lucide-react';
import { APP_CATALOG } from '../data/catalog';

interface TrackingSetupViewProps {
  onVerified: () => void;
}

export const TrackingSetupView: React.FC<TrackingSetupViewProps> = ({ onVerified }) => {
  const [targetCode, setTargetCode] = useState<string>('VAA-SITE');
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const selectedApp = APP_CATALOG.find((a) => a.trackingId === targetCode);
  const scope = selectedApp ? 'app' : 'storefront';
  const appId = selectedApp ? selectedApp.id : undefined;

  const snippet = `<script>
  (function (w, d) {
    w.VitrineTracker = {
      trackingId: "${targetCode}",
      scope: "${scope}",${appId ? `\n      appId: "${appId}",` : ''}
      lgpdAnon: true,
      track: function (eventType, extra) {
        fetch("${window.location.origin}/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify(Object.assign({
            sessionHash: localStorage.getItem("vaa_sid") || (function(){
              var s = "anon_" + Math.random().toString(36).slice(2, 10);
              localStorage.setItem("vaa_sid", s);
              return s;
            })(),
            trackingId: "${targetCode}",
            scope: "${scope}",${appId ? `\n            appId: "${appId}",` : ''}
            eventType: eventType || "pageview",
            page: w.location.pathname,
            deviceType: w.innerWidth < 640 ? "mobile" : (w.innerWidth < 1024 ? "tablet" : "desktop"),
            source: d.referrer && d.referrer.includes("google") ? "search" : "direct",
            consentGiven: true
          }, extra || {}))
        });
      }
    };
    w.VitrineTracker.track("${selectedApp ? 'app_view' : 'pageview'}");
  })(window, document);
</script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const res = await fetch('/api/analytics/verify-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId: targetCode, appId }),
      });
      const data = (await res.json()) as { verified: boolean; receivedAt: string };
      if (data.verified) {
        setVerifyMsg(
          `Evento de teste recebido com sucesso para ${targetCode} às ${new Date(
            data.receivedAt,
          ).toLocaleTimeString('pt-BR')}.`,
        );
        onVerified();
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Instalação Automática e Identificadores Exclusivos
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              O rastreamento já está ativo automaticamente na VitrineApkAc. Para aplicativos personalizados publicados externamente, utilize o código exclusivo abaixo.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="tracking-target-select" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Destino:
            </label>
            <select
              id="tracking-target-select"
              value={targetCode}
              onChange={(e) => {
                setTargetCode(e.target.value);
                setVerifyMsg(null);
              }}
              className="px-3 py-2 text-sm font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
            >
              <option value="VAA-SITE">Loja VitrineApkAc (VAA-SITE)</option>
              {APP_CATALOG.map((app) => (
                <option key={app.id} value={app.trackingId}>
                  {app.name} — {app.clientBusinessName} ({app.trackingId})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
              <Code2 className="w-4 h-4 text-blue-400" aria-hidden="true" />
              <span>Código de monitoramento · {targetCode}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar código'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-slate-200">
            <code>{snippet}</code>
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Separa automaticamente os visitantes da loja VitrineApkAc dos acessos individuais de cada aplicativo vendido.
          </div>
          <button
            type="button"
            disabled={verifying}
            onClick={handleVerify}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{verifying ? 'Enviando teste...' : 'Enviar evento de teste'}</span>
          </button>
        </div>

        {verifyMsg && (
          <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300">
            {verifyMsg}
          </div>
        )}
      </div>

      {/* Registry table of all tracking IDs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Identificadores Exclusivos Cadastrados
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-5 font-semibold">Plataforma / Aplicativo</th>
                <th className="py-2.5 px-5 font-semibold">Cliente Vinculado</th>
                <th className="py-2.5 px-5 font-semibold">Identificador</th>
                <th className="py-2.5 px-5 font-semibold">Escopo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <tr>
                <td className="py-3 px-5 font-semibold text-slate-900 dark:text-slate-100">Loja Virtual VitrineApkAc</td>
                <td className="py-3 px-5 text-slate-600 dark:text-slate-300">Administração Principal</td>
                <td className="py-3 px-5 font-mono text-blue-700 dark:text-blue-400 font-semibold">VAA-SITE</td>
                <td className="py-3 px-5 text-slate-600 dark:text-slate-300">Site e Loja Virtual</td>
              </tr>
              {APP_CATALOG.map((app) => (
                <tr key={app.id}>
                  <td className="py-3 px-5 font-semibold text-slate-900 dark:text-slate-100">{app.name}</td>
                  <td className="py-3 px-5 text-slate-600 dark:text-slate-300">{app.clientBusinessName}</td>
                  <td className="py-3 px-5 font-mono text-blue-700 dark:text-blue-400 font-semibold">{app.trackingId}</td>
                  <td className="py-3 px-5 text-slate-600 dark:text-slate-300">Aplicativo Personalizado</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
