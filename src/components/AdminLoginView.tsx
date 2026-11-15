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
  const [email, setEmail] = useState('');
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
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        admin?: { email: string; name: string };
        error?: string;
      };

      if (!res.ok || !data.authenticated || !data.admin) {
        setError(data.error || 'E-mail ou senha de administrador inválidos.');
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
    setEmail('admin@vitrineapkac.com.br');
    setPassword('Vitrine@2026');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>Acesso Restrito ao Administrador</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Administrativo
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            A aba <span className="font-semibold text-slate-800">VitrineApkAc — Analytics</span> e os dados comerciais de visitantes, faturamento e sessões são sigilosos. Faça login para acessar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700">
              E-mail do administrador
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vitrineapkac.com.br"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-2 focus:outline-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700">
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
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-2 focus:outline-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-800"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? 'Validando acesso...' : 'Entrar no Dashboard'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="text-blue-700 hover:underline font-medium cursor-pointer"
          >
            Preencher credenciais de acesso
          </button>
          <button
            type="button"
            onClick={onBackToStore}
            className="text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Voltar à vitrine
          </button>
        </div>
      </div>
    </div>
  );
};
