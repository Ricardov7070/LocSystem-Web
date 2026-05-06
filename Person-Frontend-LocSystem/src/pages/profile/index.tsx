import { useState, useEffect } from 'react';
import { Edit, ShieldCheck, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Topbar } from '../../components/layout/app-topbar';
import { useAuth } from '../../components/providers/auth';
import { Card } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import {
  Form,
  FormItem,
  FormLabel,
  FormField,
  FormControl,
  FormMessage,
} from '../../components/ui/form';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

const ProfileNameSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email(),
});
type ProfileNameSchema = z.infer<typeof ProfileNameSchema>;

const ProfilePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'As senhas não conferem',
    path: ['confirmNewPassword'],
  });
type ProfilePasswordSchema = z.infer<typeof ProfilePasswordSchema>;

function ProfileHeader() {
  const { user } = useAuth();

  return (
    <Card className="flex items-center gap-6 p-6">
      <div className="relative">
        <Avatar className="size-20">
          <AvatarImage src={user.image ?? ''} alt={user.name} />
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 opacity-0 backdrop-blur-sm transition-opacity duration-150 hover:opacity-100 cursor-pointer">
          <Edit className="size-5 text-white" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{user.name}</h1>
        <p className="text-muted-foreground">{user.email}</p>
        <Badge variant="secondary" className="mt-1">{user.role}</Badge>
      </div>
    </Card>
  );
}

function ProfileName() {
  const { user } = useAuth();

  const form = useForm<ProfileNameSchema>({
    defaultValues: { name: user.name, email: user.email },
    resolver: zodResolver(ProfileNameSchema),
  });

  function onSubmit(_data: ProfileNameSchema) {
    // TODO: chamar API
  }

  return (
    <Card>
      <header className="p-6">
        <h3 className="text-lg font-semibold">Alterar o nome do usuário</h3>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex w-full flex-wrap items-center gap-6 px-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input disabled placeholder="E-mail" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="p-6">
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}

function ProfilePassword() {
  const form = useForm<ProfilePasswordSchema>({
    resolver: zodResolver(ProfilePasswordSchema),
  });

  function onSubmit(_data: ProfilePasswordSchema) {
    // TODO: chamar API
  }

  return (
    <Card>
      <header className="p-6">
        <h3 className="text-lg font-semibold">Alterar a senha</h3>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex w-full flex-wrap items-center gap-6 px-6">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha atual</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Senha atual" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Nova senha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirmar nova senha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="p-6">
            <Button type="submit">Alterar senha</Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}

function ProfileTwoFactor() {
  const stored = localStorage.getItem('locsystem_user');
  const userStored = stored ? JSON.parse(stored) : {};

  const [step, setStep] = useState<'idle' | 'password' | 'qr' | 'verify' | 'disable'>('idle');
  const [isEnabled, setIsEnabled] = useState<boolean>(userStored.twoFactorEnabled ?? false);
  const [password, setPassword] = useState('');
  const [totpURI, setTotpURI] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Busca o status real do backend ao montar o componente
  useEffect(() => {
    api.get('/auth/2fa/status')
      .then(({ data }) => {
        setIsEnabled(data.twoFactorEnabled);
        updateStoredTwoFactor(data.twoFactorEnabled);
      })
      .catch(() => {});
  }, []);

  function resetState() {
    setStep('idle');
    setPassword('');
    setTotpURI('');
    setManualSecret('');
    setCode('');
    setError('');
    setIsLoading(false);
  }

  function updateStoredTwoFactor(value: boolean) {
    const s = localStorage.getItem('locsystem_user');
    if (s) {
      const u = JSON.parse(s);
      localStorage.setItem('locsystem_user', JSON.stringify({ ...u, twoFactorEnabled: value }));
    }
  }

  async function handleEnable() {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/2fa/enable', { password });
      setTotpURI(data.totpURI);
      setManualSecret((data.secret as string).replace(/(.{4})/g, '$1 ').trim());
      setStep('qr');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao ativar o autenticador.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify() {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/2fa/verify-activate', { code });
      updateStoredTwoFactor(true);
      setIsEnabled(true);
      resetState();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Código inválido. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisable() {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/2fa/disable', { password });
      updateStoredTwoFactor(false);
      setIsEnabled(false);
      resetState();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao desativar o autenticador.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Passo: confirmar senha para ativar ──────────────────────────────────
  if (step === 'password') {
    return (
      <Card>
        <header className="flex items-center gap-3 p-6">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Autenticação em duas etapas</h3>
        </header>
        <div className="space-y-4 px-6">
          <p className="text-sm text-muted-foreground">
            Confirme sua senha para gerar um novo autenticador.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha atual</label>
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (!e.target.value) setError('');
              }}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <div className="flex gap-2 p-6">
          <Button onClick={handleEnable} disabled={!password || isLoading}>
            {isLoading ? <><Loader2 className="size-4 animate-spin" /> Gerando...</> : 'Continuar'}
          </Button>
          <Button variant="outline" onClick={resetState} className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white">Cancelar</Button>
        </div>
      </Card>
    );
  }

  // ── Passo: exibir QR Code ───────────────────────────────────────────────
  if (step === 'qr') {
    return (
      <Card>
        <header className="flex items-center gap-3 p-6">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Escanear QR Code</h3>
        </header>
        <div className="space-y-4 px-6">
          <p className="text-sm text-muted-foreground">
            Escaneie com Google Authenticator, Authy ou similar. O app mostrará{' '}
            <strong>LocSystem</strong>.
          </p>
          <div className="flex justify-center rounded-lg border bg-white p-6">
            <QRCodeSVG value={totpURI} size={240} level="H" includeMargin />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Caso não consiga escanear, insira manualmente no app:
          </p>
          <div className="rounded-md border bg-muted px-4 py-2 text-center font-mono text-sm tracking-widest select-all">
            {manualSecret}
          </div>
        </div>
        <div className="flex gap-2 p-6">
          <Button onClick={() => setStep('verify')}>Já escaneei o código</Button>
          <Button variant="outline" onClick={resetState} className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white">Cancelar</Button>
        </div>
      </Card>
    );
  }

  // ── Passo: verificar código para ativar ─────────────────────────────────
  if (step === 'verify') {
    return (
      <Card>
        <header className="flex items-center gap-3 p-6">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Verificar autenticador</h3>
        </header>
        <div className="space-y-4 px-6">
          <p className="text-sm text-muted-foreground">
            Digite o código de 6 dígitos exibido no app.
          </p>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 p-6">
          <Button onClick={handleVerify} disabled={code.length !== 6 || isLoading}>
            {isLoading ? <><Loader2 className="size-4 animate-spin" /> Verificando...</> : 'Verificar'}
          </Button>
          <Button variant="outline" onClick={resetState} className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white">Cancelar</Button>
        </div>
      </Card>
    );
  }

  // ── Passo: confirmar senha para desativar ───────────────────────────────
  if (step === 'disable') {
    return (
      <Card>
        <header className="flex items-center gap-3 p-6">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Desativar autenticação em duas etapas</h3>
        </header>
        <div className="space-y-4 px-6">
          <p className="text-sm text-muted-foreground">
            Insira sua senha para confirmar a desativação do autenticador.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha atual</label>
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (!e.target.value) setError('');
              }}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <div className="flex gap-2 p-6">
          <Button variant="destructive" onClick={handleDisable} disabled={!password || isLoading}>
            {isLoading ? <><Loader2 className="size-4 animate-spin" /> Desativando...</> : 'Confirmar desativação'}
          </Button>
          <Button variant="outline" onClick={resetState} className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white">Cancelar</Button>
        </div>
      </Card>
    );
  }

  // ── Estado idle: ativo ou inativo ───────────────────────────────────────
  return (
    <Card>
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className={`size-5 ${isEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
          <h3 className="text-lg font-semibold">Autenticação em duas etapas</h3>
        </div>
        {isEnabled && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500">
            <span className="size-1.5 rounded-full bg-green-500" />
            Ativada
          </span>
        )}
      </header>
      <Separator />
      <div className="space-y-4 p-6">
        {isEnabled ? (
          <>
            <p className="text-sm text-muted-foreground">
              Sua conta está protegida com autenticação em duas etapas via aplicativo autenticador.
            </p>
            <Button variant="outline" onClick={() => setStep('disable')} className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white">
              Desativar autenticador
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Configure um aplicativo autenticador para aumentar a segurança da sua conta.
            </p>
            <Button onClick={() => setStep('password')}>
              Configurar autenticador
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Perfil' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e segurança
          </p>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-4 px-10">
        <ProfileHeader />
        <ProfileName />
        <ProfilePassword />
        <ProfileTwoFactor />
      </main>
    </>
  );
}
