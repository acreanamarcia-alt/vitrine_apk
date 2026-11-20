import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';

interface AdminLoginViewProps {
  onLoginSuccess: (admin: { email: string; name: string }) => void;
  onBackToStore: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, email: login, password }),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        admin?: { email: string; name: string };
        error?: string;
      };

      if (!res.ok || !data.authenticated || !data.admin) {
        setError(data.error || 'Login ou senha de administrador inválidos.');
        return;
      }

      onLoginSuccess(data.admin);
    } catch {
      setError('Não foi possível autenticar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDefaultCredentials = () => {
    setLogin('vitrine.adm');
    setPassword('vintrine@2026');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>Acesso Restrito ao Administrador</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Dashboard Administrativo
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            As abas <span className="font-semibold text-slate-800 dark:text-slate-100">VitrineApkAc — Analytics</span> e <span className="font-semibold text-slate-800 dark:text-slate-100">Dashboard Financeiro</span> contêm informações sigilosas de acessos, vendas e comissões. Faça login para acessar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-login" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Login do administrador
            </label>
            <input
              id="admin-login"
              type="text"
              required
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="vitrine.adm"
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Senha de acesso
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg text-xs font-medium text-red-800 dark:text-red-300"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? 'Validando acesso...' : 'Entrar no Dashboard'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer"
          >
            Preencher credenciais de acesso
          </button>
          <button
            type="button"
            onClick={onBackToStore}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Voltar à vitrine
          </button>
        </div>
      </div>
    </div>
  );
};
