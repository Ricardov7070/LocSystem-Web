import { z } from 'zod';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, CheckCheck, Ellipsis, KeyRound, Pencil, RefreshCcw, ShieldAlert, Trash2 } from 'lucide-react';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { dialog } from '../../components/dialog';
import { LegalAdvisoryMultiSelectCombobox } from '../../components/ui/legal-advisory-multiselect-combobox';
import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';

type AdvisoryUser = {
  i_id: number;
  v_name: string;
  v_email: string;
  v_phone: string | null;
  e_role: string;
  e_approval_status: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  d_approved_at: string | null;
  v_approved_by: string | null;
  b_banned: boolean;
  t_ban_reason: string | null;
  e_subscriptionStatus: 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | string;
  d_subscriptionExpiresAt: string | null;
  b_twoFactorEnabled: boolean;
  b_mustChangePassword: boolean;
  created_at: string;
  updated_at: string;
  legalAdvisoryIds: string[];
  legalAdvisories: Array<{ id: string; name: string; wallet: { name: string } | null }>;
  isActive: boolean;
};

const advisoryUserEditSchema = z.object({
  v_name: z.string().min(1, 'Nome e obrigatorio'),
  v_email: z.string().email('Email invalido'),
  v_phone: z.string().min(10, 'Telefone invalido'),
  legalAdvisoryIds: z.array(z.string()).min(1, 'Selecione ao menos uma assessoria'),
});

const changePasswordSchema = z.object({
  v_password: z.string().min(8, 'Minimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmacao obrigatoria'),
}).refine((data) => data.v_password === data.confirmPassword, {
  message: 'As senhas nao conferem',
  path: ['confirmPassword'],
});

const renewSubscriptionSchema = z.object({
  d_subscription_expires_at: z.string().min(1, 'A data de vencimento e obrigatoria'),
});

function getApprovalLabel(status: AdvisoryUser['e_approval_status']) {
  if (!status) return 'Pendente';
  if (status === 'APPROVED') return 'Aprovado';
  if (status === 'PENDING') return 'Pendente';
  if (status === 'REJECTED') return 'Reprovado';
  return status === 'APPROVED' ? 'Aprovado' : 'Pendente';
}

function getApprovalBadgeClass(status: AdvisoryUser['e_approval_status']) {
  if (!status) return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (status === 'REJECTED') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function getSubscriptionLabel(user: AdvisoryUser) {
  if (user.e_subscriptionStatus === 'ACTIVE') return 'Ativa';
  if (user.e_subscriptionStatus === 'PAST_DUE') return 'Expirada';
  if (user.e_subscriptionStatus === 'INACTIVE') return 'Inativa';
  if (user.e_subscriptionStatus === 'CANCELED') return 'Cancelada';
  return user.e_subscriptionStatus;
}

function getSubscriptionBadgeClass(user: AdvisoryUser) {
  if (user.e_subscriptionStatus === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (user.e_subscriptionStatus === 'PAST_DUE') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (user.e_subscriptionStatus === 'CANCELED') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function needsAccessAlert(user: AdvisoryUser) {
  return user.e_approval_status !== 'APPROVED' || user.b_banned || user.e_subscriptionStatus !== 'ACTIVE';
}

const successMenuItemClass =
  'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 dark:focus:bg-emerald-950/40 dark:focus:text-emerald-300';

const warningMenuItemClass =
  'text-amber-600 hover:bg-amber-50 hover:text-amber-700 focus:bg-amber-50 focus:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 dark:focus:bg-amber-950/40 dark:focus:text-amber-300';

const dangerMenuItemClass =
  'text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 dark:focus:bg-red-950/40 dark:focus:text-red-300';

export default function AdvisoryUserDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const advisoryUserId = Number(id);

  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const { data: user, isLoading } = useQuery<AdvisoryUser>({
    queryKey: ['advisory-user-detail', advisoryUserId],
    queryFn: async () => {
      const response = await api.get(`/advisory-users/${advisoryUserId}`);
      return (response.data.advisoryUser ?? response.data) as AdvisoryUser;
    },
    enabled: Number.isFinite(advisoryUserId),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ idRecord, payload }: { idRecord: number; payload: Record<string, unknown> }) => {
      const response = await api.put(`/advisory-users/${idRecord}`, payload);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (idRecord: number) => {
      const response = await api.delete(`/advisory-users/${idRecord}`);
      return response.data;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ idRecord, isActive }: { idRecord: number; isActive: boolean }) => {
      const response = await api.patch(`/advisory-users/${idRecord}/status`, { isActive });
      return response.data;
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async (idRecord: number) => {
      const response = await api.patch(`/advisory-users/${idRecord}/approval`);
      return response.data;
    },
  });

  const renewSubscriptionMutation = useMutation({
    mutationFn: async ({ idRecord, expiresAt }: { idRecord: number; expiresAt: string }) => {
      const response = await api.patch(`/advisory-users/${idRecord}/subscription`, {
        d_subscription_expires_at: expiresAt,
      });
      return response.data;
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ idRecord, password }: { idRecord: number; password: string }) => {
      const response = await api.patch(`/advisory-users/${idRecord}/password`, { v_password: password });
      return response.data;
    },
  });

  const reset2faMutation = useMutation({
    mutationFn: async (idRecord: number) => {
      const response = await api.post(`/advisory-users/${idRecord}/reset-2fa`);
      return response.data;
    },
  });

  async function refreshUser() {
    await queryClient.invalidateQueries({ queryKey: ['advisory-user-detail', advisoryUserId] });
    await queryClient.invalidateQueries({ queryKey: ['advisory-users'] });
  }

  useEffect(() => {
    if (!id || Number.isNaN(advisoryUserId)) {
      navigate('/users/advisory-users', { replace: true });
    }
  }, [id, advisoryUserId, navigate]);

  async function handleEdit() {
    if (!user) return;

    await dialog.form('Editar usuario de assessoria', {
      description: 'Atualize os dados do usuario',
      schema: advisoryUserEditSchema,
      submitText: 'Salvar alteracoes',
      defaultValues: {
        v_name: user.v_name,
        v_email: user.v_email,
        v_phone: user.v_phone ?? '',
        legalAdvisoryIds: user.legalAdvisoryIds ?? [],
      },
      form: (form) => (
        <>
          <FormField control={form.control} name="v_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="v_email" render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="v_phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="legalAdvisoryIds" render={({ field }) => (
            <FormItem>
              <FormLabel>Assessorias Juridicas</FormLabel>
              <FormControl>
                <LegalAdvisoryMultiSelectCombobox
                  value={field.value || []}
                  onValueChange={field.onChange}
                  placeholder="Selecione as assessorias juridicas"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      ),
      async handler({ form, data }) {
        try {
          const payload = {
            ...data,
            legalAdvisoryIds: data.legalAdvisoryIds.map((value) => Number(value)),
          };
          const response = await updateMutation.mutateAsync({ idRecord: advisoryUserId, payload });
          setAlertInfo({ message: response?.success ?? 'Usuario atualizado com sucesso', type: 'success' });
          await refreshUser();
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof z.infer<typeof advisoryUserEditSchema>, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao atualizar usuario.', type: 'error' });
          throw new Error('Falha ao atualizar');
        }
      },
    });
  }

  async function handleChangePassword() {
    await dialog.form('Alterar senha do usuario', {
      description: 'Defina a nova senha de acesso',
      schema: changePasswordSchema,
      submitText: 'Alterar senha',
      defaultValues: {
        v_password: '',
        confirmPassword: '',
      },
      form: (form) => (
        <>
          <FormField control={form.control} name="v_password" render={({ field }) => (
            <FormItem>
              <FormLabel>Nova senha</FormLabel>
              <FormControl><Input type="password" placeholder="Nova senha" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar senha</FormLabel>
              <FormControl><Input type="password" placeholder="Confirmar senha" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      ),
      async handler({ data }) {
        const response = await changePasswordMutation.mutateAsync({ idRecord: advisoryUserId, password: data.v_password });
        setAlertInfo({ message: response?.success ?? 'Senha alterada com sucesso', type: 'success' });
        return response;
      },
    });
  }

  async function handleReset2FA() {
    const confirmed = await dialog.confirm('Resetar 2FA', {
      description: 'Deseja resetar o 2FA deste usuario?',
      actionText: 'Resetar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await reset2faMutation.mutateAsync(advisoryUserId);
      setAlertInfo({ message: response?.success ?? '2FA resetado com sucesso', type: 'success' });
      await refreshUser();
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao resetar 2FA.', type: 'error' });
    }
  }

  async function handleApprove() {
    if (!user || user.e_approval_status === 'APPROVED') return;

    const confirmed = await dialog.confirm('Aprovar usuario', {
      description: `Deseja aprovar o usuario ${user.v_name} para acesso ao sistema?`,
      actionText: 'Aprovar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await approvalMutation.mutateAsync(advisoryUserId);
      setAlertInfo({ message: response?.success ?? 'Usuario aprovado com sucesso', type: 'success' });
      await refreshUser();
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao aprovar usuario.', type: 'error' });
    }
  }

  async function handleRenewSubscription() {
    if (!user) return;

    await dialog.form('Renovar assinatura', {
      description: 'Defina o novo vencimento da assinatura do usuario de assessoria.',
      schema: renewSubscriptionSchema,
      submitText: 'Renovar assinatura',
      defaultValues: {
        d_subscription_expires_at: user.d_subscriptionExpiresAt
          ? new Date(user.d_subscriptionExpiresAt).toISOString().slice(0, 10)
          : '',
      },
      form: (form) => (
        <FormField control={form.control} name="d_subscription_expires_at" render={({ field }) => (
          <FormItem>
            <FormLabel>Data de vencimento</FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      ),
      async handler({ form, data }) {
        try {
          const response = await renewSubscriptionMutation.mutateAsync({
            idRecord: advisoryUserId,
            expiresAt: data.d_subscription_expires_at,
          });
          setAlertInfo({ message: response?.success ?? 'Assinatura renovada com sucesso', type: 'success' });
          await refreshUser();
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors?.d_subscription_expires_at) {
            form.setError('d_subscription_expires_at', { message: errors.d_subscription_expires_at[0] });
            throw new Error('Falha de validacao');
          }

          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao renovar assinatura.', type: 'error' });
          throw new Error('Falha ao renovar');
        }
      },
    });
  }

  async function handleToggleStatus() {
    if (!user) return;

    const action = user.isActive ? 'bloquear' : 'ativar';
    const confirmed = await dialog.confirm(`${action === 'bloquear' ? 'Bloquear' : 'Ativar'} usuario`, {
      description: `Deseja ${action} este usuario?`,
      actionText: action === 'bloquear' ? 'Bloquear' : 'Ativar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await toggleStatusMutation.mutateAsync({ idRecord: advisoryUserId, isActive: !user.isActive });
      setAlertInfo({ message: response?.success ?? 'Status atualizado com sucesso', type: 'success' });
      await refreshUser();
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao atualizar status.', type: 'error' });
    }
  }

  async function handleDelete() {
    const confirmed = await dialog.confirm('Excluir usuario', {
      description: 'Deseja excluir este usuario de assessoria?',
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(advisoryUserId);
      setAlertInfo({ message: response?.success ?? 'Usuario excluido com sucesso', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['advisory-users'] });
      navigate('/users/advisory-users', { replace: true });
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao excluir usuario.', type: 'error' });
    }
  }

  return (
    <>
      {(isLoading || updateMutation.isPending || deleteMutation.isPending || toggleStatusMutation.isPending || approvalMutation.isPending || renewSubscriptionMutation.isPending || changePasswordMutation.isPending || reset2faMutation.isPending) && <Loading />}
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      )}

      <Topbar
        breadcrumbs={[
          { label: 'Usuarios de Assessoria', href: '/users/advisory-users' },
          { label: user?.v_name ?? 'Detalhes' },
        ]}
      />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">{user?.v_name ?? 'Usuario de Assessoria'}</h1>
          <p className="text-muted-foreground">Detalhes do Usuario</p>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="mr-2 size-4" />
                Atualizar
              </DropdownMenuItem>
              {user?.e_approval_status !== 'APPROVED' ? (
                <DropdownMenuItem onClick={handleApprove} className={successMenuItemClass}>
                  <CheckCheck className="mr-2 size-4" />
                  Aprovar
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={handleRenewSubscription} className={successMenuItemClass}>
                <RefreshCcw className="mr-2 size-4" />
                Renovar assinatura
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleChangePassword}>
                <KeyRound className="mr-2 size-4" />
                Alterar senha
              </DropdownMenuItem>
                {user?.b_twoFactorEnabled ? (
                  <DropdownMenuItem onClick={handleReset2FA} className={warningMenuItemClass}>
                    <ShieldAlert className="mr-2 size-4" />
                    Resetar 2FA
                  </DropdownMenuItem>
                ) : null}
              {user?.isActive ? (
                <DropdownMenuItem onClick={handleToggleStatus} className={dangerMenuItemClass}>
                  <Ban className="mr-2 size-4" />
                  Bloquear
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem className={dangerMenuItemClass} onClick={handleDelete}>
                <Trash2 className="mr-2 size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        {user && needsAccessAlert(user) ? (
          <Alert className="border-red-500/40 bg-red-950/20 text-red-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {user.e_approval_status !== 'APPROVED'
                ? 'Usuario pendente de aprovacao'
                : user.b_banned
                  ? 'Usuario bloqueado'
                  : 'Assinatura inativa'}
            </AlertTitle>
            <AlertDescription>
              {user.e_approval_status !== 'APPROVED'
                ? 'Este usuario ainda nao foi aprovado para acessar o sistema.'
                : user.b_banned
                  ? user.t_ban_reason || 'Este usuario esta bloqueado no momento.'
                  : 'Este usuario nao possui uma assinatura ativa.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div>
          <h2 className="mb-4 text-lg font-semibold">Informacoes do Usuario</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {[
                { label: 'Nome', value: user?.v_name ?? '-' },
                { label: 'E-mail', value: user?.v_email ?? '-' },
                { label: 'Telefone', value: user?.v_phone ?? '-' },
                { label: 'Funcao', value: <Badge variant="secondary">{user?.e_role ?? 'AUDITOR'}</Badge> },
                {
                  label: 'Aprovacao',
                  value: user
                    ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getApprovalBadgeClass(user.e_approval_status)}`}>{getApprovalLabel(user.e_approval_status)}</span>
                    : '-',
                },
                {
                  label: 'Status',
                  value: <Badge>{user?.isActive ? 'Ativo' : 'Inativo'}</Badge>,
                },
                {
                  label: 'Assinatura',
                  value: user
                    ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getSubscriptionBadgeClass(user)}`}>{getSubscriptionLabel(user)}</span>
                    : '-',
                },
                { label: 'Vencimento', value: user?.d_subscriptionExpiresAt ? format(new Date(user.d_subscriptionExpiresAt), 'dd/MM/yyyy') : '-' },
                { label: '2FA', value: <Badge variant="secondary">{user?.b_twoFactorEnabled ? 'Ativo' : 'Inativo'}</Badge> },
                { label: 'Cadastrado em', value: user?.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : '-' },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">{row.label}</span>
                    <span className="text-sm">{row.value}</span>
                  </div>
                  {i < arr.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Assessorias Juridicas Vinculadas</h2>
          <Card className="p-6">
            <div className="overflow-auto rounded-lg border">
              <div className="grid grid-cols-[1fr_1fr] gap-4 border-b p-4 font-medium text-muted-foreground text-sm">
                <div>Nome da Assessoria</div>
                <div>Carteira</div>
              </div>

              {!user?.legalAdvisories?.length ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  Nenhuma assessoria vinculada
                </div>
              ) : (
                <div className="divide-y">
                  {user.legalAdvisories.map((advisory) => (
                    <div key={advisory.id} className="grid grid-cols-[1fr_1fr] gap-4 p-4 text-sm">
                      <div>{advisory.name}</div>
                      <div className="text-muted-foreground">{advisory.wallet?.name ?? 'Sem carteira'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
