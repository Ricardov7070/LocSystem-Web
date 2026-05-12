import { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldCheck, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomAlert from '../../hooks/useCustomAlert';

import api from '../../services/api';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import AuthLayout from '../../components/layout/layout';
import Loading from '../../components/ui/Loading';

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const hasVerified = useRef(false);

  const preAuthToken = sessionStorage.getItem('locsystem_preauth');
  const email = sessionStorage.getItem('locsystem_preauth_email') ?? '';

  useEffect(() => {
    if (!preAuthToken && !hasVerified.current) {
      navigate('/login', { replace: true });
    }
  }, [preAuthToken, navigate]);

  async function handleVerify() {
    if (code.length !== 6) return;
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/2fa/verify-login', { preAuthToken, code });

      localStorage.setItem('locsystem_token', data.access_token);
      const rawPhone2fa = data.phone ?? '';
      const formattedPhone2fa = rawPhone2fa.replace(/\D/g, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
      localStorage.setItem('locsystem_user', JSON.stringify({
        id:               data.id    ?? '',
        name:             data.user  ?? email,
        email:            data.email ?? email,
        role:             data.role  ?? 'ADMIN',
        image:            data.image ?? undefined,
        phone:            formattedPhone2fa,
        twoFactorEnabled: true,
      }));

      hasVerified.current = true;
      sessionStorage.removeItem('locsystem_preauth');
      sessionStorage.removeItem('locsystem_preauth_email');

      if (data.success) setAlertInfo({ message: `✅ ${data.success}`, type: 'success' });

      setTimeout(() => navigate('/vehicles', { replace: true }), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Código inválido. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {isLoading && <Loading />}
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      )}
      <AuthLayout>
      <Card className="max-w-sm space-y-6 p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="size-10 text-primary" />
          <h1 className="text-xl font-semibold">Verificação em duas etapas</h1>
          <p className="text-sm text-muted-foreground">
            Digite o código de 6 dígitos do seu aplicativo autenticador.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl tracking-widest"
            value={code}
            onChange={(e) => {
              setError('');
              setCode(e.target.value.replace(/\D/g, ''));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6 && !isLoading) handleVerify();
            }}
            autoFocus
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={handleVerify}
          disabled={code.length !== 6 || isLoading}
        >
          {isLoading
            ? <><Loader2 className="size-4 animate-spin" /> Verificando...</>
            : <><Search className="size-4" /> Verificar</>}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Sessão expira em 5 minutos.{' '}
          <button
            className="underline hover:text-foreground"
            onClick={() => {
              sessionStorage.removeItem('locsystem_preauth');
              sessionStorage.removeItem('locsystem_preauth_email');
              navigate('/login');
            }}
          >
            Voltar ao login
          </button>
        </p>
      </Card>
    </AuthLayout>
    </>
  );
}
