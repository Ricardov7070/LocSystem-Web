import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, CheckCheck, Ellipsis, KeyRound, Pencil, ShieldAlert, Trash2 } from 'lucide-react';

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
import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';

type AdminUser = {
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
  b_twoFactorEnabled: boolean;
  b_mustChangePassword: boolean;
  created_at: string;
  updated_at: string;
  isActive: boolean;
  isPrimaryAdmin: boolean;
};

const adminUserEditSchema = z.object({
  v_name: z.string().min(1, 'Nome e obrigatorio'),
  v_email: z.string().email('Email invalido'),
  v_phone: z.string().min(10, 'Telefone invalido'),
});

const changePasswordSchema = z.object({
  v_password: z.string().min(8, 'Minimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmacao obrigatoria'),
}).refine((data) => data.v_password === data.confirmPassword, {
  message: 'As senhas nao conferem',
  path: ['confirmPassword'],
});

const blockReasonSchema = z.object({
  reason: z.string().optional(),
});

function getApprovalLabel(status: AdminUser['e_approval_status']) {
  if (!status) return 'Pendente';
  if (status === 'APPROVED') return 'Aprovado';
  if (status === 'PENDING') return 'Pendente';
  if (status === 'REJECTED') return 'Reprovado';
  return status === 'APPROVED' ? 'Aprovado' : 'Pendente';
}

function getApprovalBadgeClass(status: AdminUser['e_approval_status']) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (status === 'REJECTED') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function getStatusLabel(user: AdminUser) {
  if (user.e_approval_status !== 'APPROVED') return 'Pendente de Aprovacao';
  if (user.b_banned) return 'Bloqueado';
  return 'Ativo';
}

function getStatusBadgeClass(user: AdminUser) {
  if (user.e_approval_status !== 'APPROVED') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (user.b_banned) return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
}

function needsAccessAlert(user: AdminUser) {
  return user.e_approval_status !== 'APPROVED' || user.b_banned;
}

const successMenuItemClass =
  'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 dark:focus:bg-emerald-950/40 dark:focus:text-emerald-300';

const warningMenuItemClass =
  'text-amber-600 hover:bg-amber-50 hover:text-amber-700 focus:bg-amber-50 focus:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 dark:focus:bg-amber-950/40 dark:focus:text-amber-300';

const dangerMenuItemClass =
  'text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 dark:focus:bg-red-950/40 dark:focus:text-red-300';

export default function AdminUserDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const adminUserId = Number(id);

  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const { data: user, isLoading } = useQuery<AdminUser>({
    queryKey: ['admin-user-detail', adminUserId],
    queryFn: async () => {
      const response = await api.get(`/admin-users/${adminUserId}`);
      return (response.data.adminUser ?? response.data) as AdminUser;
    },
    enabled: Number.isFinite(adminUserId),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ idRecord, payload }: { idRecord: number; payload: Record<string, unknown> }) => {
      const response = await api.put(`/admin-users/${idRecord}`, payload);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (idRecord: number) => {
      const response = await api.delete(`/admin-users/${idRecord}`);
      return response.data;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ idRecord, isActive, reason }: { idRecord: number; isActive: boolean; reason?: string | null }) => {
      const response = await api.patch(`/admin-users/${idRecord}/status`, { isActive, reason });
      return response.data;
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async (idRecord: number) => {
      const response = await api.patch(`/admin-users/${idRecord}/approval`);
      return response.data;
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ idRecord, password }: { idRecord: number; password: string }) => {
      const response = await api.patch(`/admin-users/${idRecord}/password`, { v_password: password });
      return response.data;
    },
  });

  const reset2faMutation = useMutation({
    mutationFn: async (idRecord: number) => {
      const response = await api.post(`/admin-users/${idRecord}/reset-2fa`);
      return response.data;
    },
  });

  async function refreshUser() {
    await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', adminUserId] });
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  useEffect(() => {
    if (!id || Number.isNaN(adminUserId)) {
      navigate('/users/admin-users', { replace: true });
    }
  }, [id, adminUserId, navigate]);

  async function handleEdit() {
    if (!user) return;

    await dialog.form('Editar administrador', {
      description: 'Atualize os dados do administrador',
      schema: adminUserEditSchema,
      submitText: 'Salvar alteracoes',
      defaultValues: {
        v_name: user.v_name,
        v_email: user.v_email,
        v_phone: user.v_phone ?? '',
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
        </>
      ),
      async handler({ form, data }) {
        try {
          const response = await updateMutation.mutateAsync({ idRecord: adminUserId, payload: data });
          setAlertInfo({ message: response?.success ?? 'Administrador atualizado com sucesso', type: 'success' });
          await refreshUser();
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof z.infer<typeof adminUserEditSchema>, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao atualizar administrador.', type: 'error' });
          throw new Error('Falha ao atualizar');
        }
      },
    });
  }

  async function handleChangePassword() {
    await dialog.form('Alterar senha do administrador', {
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
        const response = await changePasswordMutation.mutateAsync({ idRecord: adminUserId, password: data.v_password });
        setAlertInfo({ message: response?.success ?? 'Senha alterada com sucesso', type: 'success' });
        return response;
      },
    });
  }

  async function handleReset2FA() {
    const confirmed = await dialog.confirm('Resetar 2FA', {
      description: 'Deseja resetar o 2FA deste administrador?',
      actionText: 'Resetar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await reset2faMutation.mutateAsync(adminUserId);
      setAlertInfo({ message: response?.success ?? '2FA resetado com sucesso', type: 'success' });
      await refreshUser();
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao resetar 2FA.', type: 'error' });
    }
  }

  async function handleApprove() {
    if (!user || user.e_approval_status === 'APPROVED') return;

    const confirmed = await dialog.confirm('Aprovar administrador', {
      description: `Deseja aprovar o administrador ${user.v_name} para acesso ao sistema?`,
      actionText: 'Aprovar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await approvalMutation.mutateAsync(adminUserId);
      setAlertInfo({ message: response?.success ?? 'Administrador aprovado com sucesso', type: 'success' });
      await refreshUser();
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao aprovar administrador.', type: 'error' });
    }
  }

  async function handleToggleStatus() {
    if (!user || !user.isActive || user.isPrimaryAdmin) return;

    await dialog.form('Bloquear administrador', {
      description: 'Opcionalmente informe o motivo do bloqueio.',
      schema: blockReasonSchema,
      submitText: 'Bloquear',
      defaultValues: { reason: '' },
      form: (form) => (
        <FormField control={form.control} name="reason" render={({ field }) => (
          <FormItem>
            <FormLabel>Motivo</FormLabel>
            <FormControl><Input placeholder="Motivo do bloqueio" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      ),
      async handler({ data }) {
        try {
          const response = await toggleStatusMutation.mutateAsync({ idRecord: adminUserId, isActive: false, reason: data.reason || null });
          setAlertInfo({ message: response?.success ?? 'Administrador bloqueado com sucesso', type: 'success' });
          await refreshUser();
          return response;
        } catch (err: any) {
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao bloquear administrador.', type: 'error' });
          throw new Error('Falha ao bloquear');
        }
      },
    });
  }

  async function handleDelete() {
    if (!user) return;

    const confirmed = await dialog.confirm('Excluir administrador', {
      description: 'Deseja excluir este administrador?',
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(adminUserId);
      setAlertInfo({ message: response?.success ?? 'Administrador excluido com sucesso', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      navigate('/users/admin-users', { replace: true });
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao excluir administrador.', type: 'error' });
    }
  }

  return (
    <>
      {(isLoading || updateMutation.isPending || deleteMutation.isPending || toggleStatusMutation.isPending || approvalMutation.isPending || changePasswordMutation.isPending || reset2faMutation.isPending) && <Loading />}
      {alertInfo ? (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      ) : null}

      <Topbar
        breadcrumbs={[
          { label: 'Administradores', href: '/users/admin-users' },
          { label: user?.v_name ?? 'Detalhes' },
        ]}
      />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">{user?.v_name ?? 'Administrador'}</h1>
          <p className="text-muted-foreground">Detalhes do Administrador</p>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!user?.isPrimaryAdmin ? (
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="mr-2 size-4" />
                  Atualizar
                </DropdownMenuItem>
              ) : null}
              {user?.e_approval_status !== 'APPROVED' && !user?.isPrimaryAdmin ? (
                <DropdownMenuItem onClick={handleApprove} className={successMenuItemClass}>
                  <CheckCheck className="mr-2 size-4" />
                  Aprovar
                </DropdownMenuItem>
              ) : null}
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
              {user?.isActive && !user?.isPrimaryAdmin ? (
                <DropdownMenuItem onClick={handleToggleStatus} className={dangerMenuItemClass}>
                  <Ban className="mr-2 size-4" />
                  Bloquear
                </DropdownMenuItem>
              ) : null}
              {!user?.isPrimaryAdmin ? (
                <DropdownMenuItem className={dangerMenuItemClass} onClick={handleDelete}>
                  <Trash2 className="mr-2 size-4" />
                  Excluir
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        {user && needsAccessAlert(user) ? (
          <Alert className="border-red-500/40 bg-red-950/20 text-red-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {user.e_approval_status !== 'APPROVED' ? 'Administrador pendente de aprovacao' : 'Administrador bloqueado'}
            </AlertTitle>
            <AlertDescription>
              {user.e_approval_status !== 'APPROVED'
                ? 'Este administrador ainda nao foi aprovado para acessar o sistema.'
                : user.t_ban_reason || 'Este administrador esta bloqueado no momento.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div>
          <h2 className="mb-4 text-lg font-semibold">Informacoes do Administrador</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Nome', value: user?.v_name ?? '-' },
                  { label: 'E-mail', value: user?.v_email ?? '-' },
                  { label: 'Telefone', value: user?.v_phone ?? '-' },
                  { label: 'Funcao', value: <Badge variant="secondary">{user?.e_role ?? 'ADMIN'}</Badge> },
                  {
                    label: 'Aprovacao',
                    value: user ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getApprovalBadgeClass(user.e_approval_status)}`}>
                        {getApprovalLabel(user.e_approval_status)}
                      </span>
                    ) : '-',
                  },
                  {
                    label: 'Status',
                    value: user ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getStatusBadgeClass(user)}`}>
                        {getStatusLabel(user)}
                      </span>
                    ) : '-',
                  },
                  { label: '2FA', value: user?.b_twoFactorEnabled ? 'Ativado' : 'Desativado' },
                  { label: 'Alteracao obrigatoria de senha', value: user?.b_mustChangePassword ? 'Sim' : 'Nao' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">{item.label}</div>
                    <div className="text-sm">{item.value}</div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Cadastrado em</div>
                  <div className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Atualizado em</div>
                  <div className="text-sm">{user?.updated_at ? new Date(user.updated_at).toLocaleString('pt-BR') : '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Aprovado em</div>
                  <div className="text-sm">{user?.d_approved_at ? new Date(user.d_approved_at).toLocaleString('pt-BR') : '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Aprovado por</div>
                  <div className="text-sm">{user?.v_approved_by ?? '-'}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}