import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, CheckCheck, Ellipsis, KeyRound, Pencil, RefreshCcw, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
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
import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';
import { dialog } from '../../components/dialog';
import {
  OperatorEditValues,
  OperatorForm,
  operatorEditSchema,
  operatorPasswordSchema,
  operatorRenewSchema,
  type PricingPlanOption,
} from './operator-form';
import { formatCpfCnpj, formatDate, formatPhone, stripNonDigits } from '../../lib/utils';

type OperatorDetail = {
  i_id: number;
  v_name: string;
  v_email: string;
  v_document: string | null;
  v_phone: string | null;
  e_role: string;
  e_approval_status: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  d_approved_at: string | null;
  v_approved_by: string | null;
  b_banned: boolean;
  t_ban_reason: string | null;
  b_is_courtesy: boolean;
  e_subscriptionStatus: 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  d_subscriptionExpiresAt: string | null;
  i_user_limit: number;
  b_twoFactorEnabled: boolean;
  created_at: string;
  updated_at: string;
  active_prepostos_count: number;
  total_prepostos_count: number;
  private_vehicles_count: number;
  pricingPlan: PricingPlanOption | null;
  f_total_monthly_value: number | null;
  device?: {
    i_device_id?: string | number | null;
    v_device_name?: string | null;
    v_device_country?: string | null;
    d_device_registered_at?: string | null;
    d_device_last_seen?: string | null;
  } | null;
  prepostos: Array<{
    i_id: number;
    v_name: string;
    v_email: string;
    b_banned: boolean;
    created_at: string;
  }>;
};

type AlertState = {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
};

const blockReasonSchema = z.object({
  reason: z.string().optional(),
});

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return 'Cortesia';
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getStatusLabel(operator: OperatorDetail) {
  if (operator.b_banned) return 'Bloqueado';
  if (operator.b_is_courtesy) return 'Ativa';

  const labels: Record<OperatorDetail['e_subscriptionStatus'], string> = {
    ACTIVE: 'Ativa',
    CANCELED: 'Cancelada',
    INACTIVE: 'Inativa',
    PAST_DUE: 'Expirada',
  };

  return labels[operator.e_subscriptionStatus] ?? operator.e_subscriptionStatus;
}

function getApprovalLabel(status: OperatorDetail['e_approval_status']) {
  if (!status) return 'Pendente';
  if (status === 'APPROVED') return 'Aprovado';
  if (status === 'PENDING') return 'Pendente';
  if (status === 'REJECTED') return 'Reprovado';
  return status;
}

function getApprovalBadgeClass(status: OperatorDetail['e_approval_status']) {
  if (!status) return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (status === 'REJECTED') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function getStatusBadgeClass(operator: OperatorDetail) {
  if (operator.b_banned) return 'bg-red-50 text-red-700 ring-red-200';
  if (operator.b_is_courtesy || operator.e_subscriptionStatus === 'ACTIVE') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (operator.e_subscriptionStatus === 'PAST_DUE') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function needsSubscriptionAlert(operator: OperatorDetail) {
  return (
    operator.e_approval_status !== 'APPROVED' ||
    operator.b_banned ||
    (!operator.b_is_courtesy && operator.e_subscriptionStatus !== 'ACTIVE')
  );
}

async function fetchPricingPlans() {
  const response = await api.get('/pricingPlans');
  return (response.data.pricingPlans ?? response.data.data ?? []) as PricingPlanOption[];
}

const successMenuItemClass =
  'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 dark:focus:bg-emerald-950/40 dark:focus:text-emerald-300';

const warningMenuItemClass =
  'text-amber-600 hover:bg-amber-50 hover:text-amber-700 focus:bg-amber-50 focus:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 dark:focus:bg-amber-950/40 dark:focus:text-amber-300';

const dangerMenuItemClass =
  'text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 dark:focus:bg-red-950/40 dark:focus:text-red-300';

export default function OperatorDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [alertInfo, setAlertInfo] = useState<AlertState | null>(null);

  const { data: operator, isLoading } = useQuery<OperatorDetail>({
    queryKey: ['operator-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await api.get(`/operators/${id}`);
      return response.data.operator as OperatorDetail;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ operatorId, payload }: { operatorId: number; payload: Record<string, unknown> }) => {
      const response = await api.put(`/operators/${operatorId}`, payload);
      return response.data;
    },
  });

  const renewMutation = useMutation({
    mutationFn: async ({ operatorId, payload }: { operatorId: number; payload: Record<string, unknown> }) => {
      const response = await api.patch(`/operators/${operatorId}/subscription`, payload);
      return response.data;
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ operatorId, payload }: { operatorId: number; payload: Record<string, unknown> }) => {
      const response = await api.patch(`/operators/${operatorId}/password`, payload);
      return response.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ operatorId, payload }: { operatorId: number; payload: Record<string, unknown> }) => {
      const response = await api.patch(`/operators/${operatorId}/status`, payload);
      return response.data;
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async (operatorId: number) => {
      const response = await api.patch(`/operators/${operatorId}/approval`);
      return response.data;
    },
  });

  const reset2FAMutation = useMutation({
    mutationFn: async (operatorId: number) => {
      const response = await api.post(`/operators/${operatorId}/reset-2fa`);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (operatorId: number) => {
      const response = await api.delete(`/operators/${operatorId}`);
      return response.data;
    },
  });

  async function refreshOperator() {
    await queryClient.invalidateQueries({ queryKey: ['operator-detail', id] });
    await queryClient.invalidateQueries({ queryKey: ['operators'] });
  }

  async function handleEdit() {
    if (!operator) return;

    let pricingPlans: PricingPlanOption[] = [];
    try {
      pricingPlans = await fetchPricingPlans();
    } catch (error: any) {
      setAlertInfo({
        message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao carregar planos de precificacao.',
        type: 'error',
      });
      return;
    }

    await dialog.form('Editar localizador', {
      description: 'Atualize os dados do localizador',
      schema: operatorEditSchema,
      submitText: 'Atualizar',
      submitIcon: <Pencil className="ml-2 size-4" />,
      defaultValues: {
        v_name: operator.v_name,
        v_email: operator.v_email,
        v_document: formatCpfCnpj(operator.v_document ?? ''),
        v_phone: formatPhone(operator.v_phone ?? ''),
        i_user_limit: operator.i_user_limit ?? 0,
        b_is_courtesy: operator.b_is_courtesy,
        i_pricing_plan_id: operator.pricingPlan?.i_id ? String(operator.pricingPlan.i_id) : '',
      },
      form: (form) => <OperatorForm form={form} pricingPlans={pricingPlans} isEdit />,
      async handler({ form, data }) {
        try {
          const payload = {
            v_name: data.v_name,
            v_email: data.v_email,
            v_document: stripNonDigits(data.v_document),
            v_phone: stripNonDigits(data.v_phone),
            i_user_limit: data.i_user_limit,
            b_is_courtesy: data.b_is_courtesy,
            i_pricing_plan_id: data.b_is_courtesy ? null : Number(data.i_pricing_plan_id),
          };

          const response = await updateMutation.mutateAsync({ operatorId: operator.i_id, payload });
          setAlertInfo({ message: response?.success ?? 'Localizador atualizado com sucesso.', type: 'success' });
          await refreshOperator();
          return response;
        } catch (mutationError: any) {
          const fieldMap: Record<string, keyof OperatorEditValues> = {
            v_name: 'v_name',
            v_email: 'v_email',
            v_document: 'v_document',
            v_phone: 'v_phone',
            i_user_limit: 'i_user_limit',
            i_pricing_plan_id: 'i_pricing_plan_id',
          };
          const errors = mutationError?.response?.data?.errors as Record<string, string[]> | undefined;

          if (errors) {
            Object.entries(errors).forEach(([field, messages]) => {
              const mappedField = fieldMap[field];
              if (mappedField) {
                form.setError(mappedField, { message: messages[0] });
              }
            });
            throw new Error('Falha de validacao');
          }

          setAlertInfo({
            message:
              mutationError?.response?.data?.info ?? mutationError?.response?.data?.error ?? 'Erro ao atualizar localizador.',
            type: 'error',
          });
          throw new Error('Falha ao atualizar');
        }
      },
    });
  }

  async function handleRenew() {
    if (!operator || operator.b_is_courtesy) return;

    let pricingPlans: PricingPlanOption[] = [];
    try {
      pricingPlans = await fetchPricingPlans();
    } catch (error: any) {
      setAlertInfo({
        message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao carregar planos de precificacao.',
        type: 'error',
      });
      return;
    }

    await dialog.form('Renovar assinatura', {
      description: 'Defina o novo vencimento da assinatura do localizador.',
      schema: operatorRenewSchema,
      submitText: 'Renovar assinatura',
      defaultValues: {
        d_subscription_expires_at: operator.d_subscriptionExpiresAt
          ? new Date(operator.d_subscriptionExpiresAt).toISOString().slice(0, 10)
          : '',
        i_pricing_plan_id: operator.pricingPlan?.i_id ? String(operator.pricingPlan.i_id) : '',
      },
      form: (form) => (
        <>
          <FormField
            control={form.control}
            name="d_subscription_expires_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de vencimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="i_pricing_plan_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plano de precificacao</FormLabel>
                <FormControl>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingPlans.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          Nenhum plano disponivel
                        </SelectItem>
                      ) : null}
                      {pricingPlans.map((pricingPlan) => (
                        <SelectItem key={pricingPlan.i_id} value={String(pricingPlan.i_id)}>
                          {pricingPlan.v_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      ),
      async handler({ form, data }) {
        try {
          const response = await renewMutation.mutateAsync({
            operatorId: operator.i_id,
            payload: {
              d_subscription_expires_at: data.d_subscription_expires_at,
              i_pricing_plan_id: data.i_pricing_plan_id ? Number(data.i_pricing_plan_id) : null,
            },
          });

          setAlertInfo({ message: response?.success ?? 'Assinatura renovada com sucesso.', type: 'success' });
          await refreshOperator();
          return response;
        } catch (mutationError: any) {
          const errors = mutationError?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors?.d_subscription_expires_at) {
            form.setError('d_subscription_expires_at', { message: errors.d_subscription_expires_at[0] });
            throw new Error('Falha de validacao');
          }
          if (errors?.i_pricing_plan_id) {
            form.setError('i_pricing_plan_id', { message: errors.i_pricing_plan_id[0] });
            throw new Error('Falha de validacao');
          }

          setAlertInfo({
            message:
              mutationError?.response?.data?.info ?? mutationError?.response?.data?.error ?? 'Erro ao renovar assinatura.',
            type: 'error',
          });
          throw new Error('Falha ao renovar');
        }
      },
    });
  }

  async function handleChangePassword() {
    if (!operator) return;

    await dialog.form('Alterar senha', {
      description: 'Defina uma nova senha para o localizador.',
      schema: operatorPasswordSchema,
      submitText: 'Atualizar senha',
      defaultValues: {
        v_password: '',
        confirmPassword: '',
      },
      form: (form) => (
        <>
          <FormField
            control={form.control}
            name="v_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      ),
      async handler({ form, data }) {
        try {
          const response = await passwordMutation.mutateAsync({
            operatorId: operator.i_id,
            payload: { v_password: data.v_password },
          });
          setAlertInfo({ message: response?.success ?? 'Senha alterada com sucesso.', type: 'success' });
          return response;
        } catch (mutationError: any) {
          const errors = mutationError?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors?.v_password) {
            form.setError('v_password', { message: errors.v_password[0] });
            throw new Error('Falha de validacao');
          }

          setAlertInfo({
            message: mutationError?.response?.data?.info ?? mutationError?.response?.data?.error ?? 'Erro ao alterar senha.',
            type: 'error',
          });
          throw new Error('Falha ao alterar senha');
        }
      },
    });
  }

  async function handleToggleStatus() {
    if (!operator) return;

    if (operator.b_banned) {
      const confirmed = await dialog.confirm('Desbloquear localizador', {
        description: `Deseja desbloquear o localizador ${operator.v_name}?`,
        actionText: 'Desbloquear',
        cancelText: 'Cancelar',
      });

      if (!confirmed) return;

      try {
        const response = await statusMutation.mutateAsync({
          operatorId: operator.i_id,
          payload: { isActive: true },
        });
        setAlertInfo({ message: response?.success ?? 'Localizador desbloqueado com sucesso.', type: 'success' });
        await refreshOperator();
      } catch (error: any) {
        setAlertInfo({
          message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao desbloquear localizador.',
          type: 'error',
        });
      }
      return;
    }

    await dialog.form('Bloquear localizador', {
      description: 'Opcionalmente informe o motivo do bloqueio.',
      schema: blockReasonSchema,
      submitText: 'Bloquear',
      defaultValues: { reason: '' },
      form: (form) => (
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo</FormLabel>
              <FormControl>
                <Input placeholder="Motivo do bloqueio" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ),
      async handler({ data }) {
        try {
          const response = await statusMutation.mutateAsync({
            operatorId: operator.i_id,
            payload: { isActive: false, reason: data.reason || null },
          });
          setAlertInfo({ message: response?.success ?? 'Localizador bloqueado com sucesso.', type: 'success' });
          await refreshOperator();
          return response;
        } catch (error: any) {
          setAlertInfo({
            message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao bloquear localizador.',
            type: 'error',
          });
          throw new Error('Falha ao bloquear');
        }
      },
    });
  }

  async function handleReset2FA() {
    if (!operator) return;

    const confirmed = await dialog.confirm('Resetar 2FA', {
      description: `Deseja resetar o 2FA do localizador ${operator.v_name}?`,
      actionText: 'Resetar 2FA',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await reset2FAMutation.mutateAsync(operator.i_id);
      setAlertInfo({ message: response?.success ?? '2FA resetado com sucesso.', type: 'success' });
      await refreshOperator();
    } catch (error: any) {
      setAlertInfo({
        message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao resetar 2FA.',
        type: 'error',
      });
    }
  }

  async function handleApprove() {
    if (!operator || operator.e_approval_status === 'APPROVED') return;

    const confirmed = await dialog.confirm('Aprovar localizador', {
      description: `Deseja aprovar o localizador ${operator.v_name} para acesso ao sistema?`,
      actionText: 'Aprovar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await approvalMutation.mutateAsync(operator.i_id);
      setAlertInfo({ message: response?.success ?? 'Localizador aprovado com sucesso.', type: 'success' });
      await refreshOperator();
    } catch (error: any) {
      setAlertInfo({
        message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao aprovar localizador.',
        type: 'error',
      });
    }
  }

  async function handleDelete() {
    if (!operator) return;

    const confirmed = await dialog.confirm('Excluir localizador', {
      description: `Deseja remover o localizador ${operator.v_name}? Esta acao nao podera ser desfeita.`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(operator.i_id);
      setAlertInfo({ message: response?.success ?? 'Localizador removido com sucesso.', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['operators'] });
      navigate('/users/operators');
    } catch (error: any) {
      setAlertInfo({
        message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao excluir localizador.',
        type: 'error',
      });
    }
  }

  if (isLoading || !operator) {
    return <Loading />;
  }

  return (
    <>
      {(updateMutation.isPending || renewMutation.isPending || passwordMutation.isPending || statusMutation.isPending || approvalMutation.isPending || reset2FAMutation.isPending || deleteMutation.isPending) && <Loading />}
      {alertInfo ? (
        <div className="fixed right-4 top-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      ) : null}

      <Topbar
        breadcrumbs={[
          { label: 'Localizadores', href: '/users/operators' },
          { label: operator.v_name },
        ]}
      />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">{operator.v_name}</h1>
          <p className="text-muted-foreground">Detalhes do localizador</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="size-4" />
              Atualizar
            </DropdownMenuItem>
            {operator.e_approval_status !== 'APPROVED' ? (
              <DropdownMenuItem onClick={handleApprove} className={successMenuItemClass}>
                <CheckCheck className="size-4" />
                Aprovar usuario
              </DropdownMenuItem>
            ) : null}
            {!operator.b_is_courtesy ? (
              <DropdownMenuItem onClick={handleRenew} className={successMenuItemClass}>
                <RefreshCcw className="size-4" />
                Renovar assinatura
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={handleChangePassword}>
              <KeyRound className="size-4" />
              Alterar senha
            </DropdownMenuItem>
            {operator.b_twoFactorEnabled ? (
              <DropdownMenuItem onClick={handleReset2FA} className={warningMenuItemClass}>
                <ShieldAlert className="size-4" />
                Resetar 2FA
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={handleToggleStatus}
              className={operator.b_banned ? successMenuItemClass : dangerMenuItemClass}
            >
              {operator.b_banned ? <ShieldCheck className="size-4" /> : <Ban className="size-4" />}
              {operator.b_banned ? 'Desbloquear' : 'Bloquear'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className={dangerMenuItemClass}>
              <Trash2 className="size-4" />
              Deletar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        {needsSubscriptionAlert(operator) ? (
          <Alert className="border-red-500/40 bg-red-950/20 text-red-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {operator.e_approval_status !== 'APPROVED'
                ? 'Localizador pendente de aprovacao'
                : operator.b_banned
                  ? 'Localizador bloqueado'
                  : 'Assinatura inativa'}
            </AlertTitle>
            <AlertDescription>
              {operator.e_approval_status !== 'APPROVED'
                ? 'Este localizador ainda nao foi aprovado para acessar o sistema.'
                : operator.b_banned
                  ? operator.t_ban_reason || 'Este localizador esta bloqueado no momento.'
                  : 'Este localizador nao possui uma assinatura ativa.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Informacoes do localizador</h2>
            <Card className="p-6">
              <div className="space-y-4">
                {[
                  { label: 'Nome', value: operator.v_name },
                  { label: 'E-mail', value: operator.v_email },
                  { label: 'Documento', value: formatCpfCnpj(operator.v_document ?? '') || '-' },
                  { label: 'Telefone', value: formatPhone(operator.v_phone ?? '') || '-' },
                  { label: 'Funcao', value: <Badge variant="secondary">{operator.e_role}</Badge> },
                  {
                    label: 'Aprovacao',
                    value: <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getApprovalBadgeClass(operator.e_approval_status)}`}>{getApprovalLabel(operator.e_approval_status)}</span>,
                  },
                  { label: 'Status', value: <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getStatusBadgeClass(operator)}`}>{getStatusLabel(operator)}</span> },
                  { label: 'Tipo de acesso', value: <Badge>{operator.b_is_courtesy ? 'Cortesia' : 'Mensalista'}</Badge> },
                  { label: 'Limite de prepostos', value: `${operator.active_prepostos_count} ativos de ${operator.i_user_limit}` },
                  { label: 'Plano de precificacao', value: operator.pricingPlan?.v_name ?? 'Cortesia' },
                  { label: 'Valor total mensal', value: formatCurrency(operator.f_total_monthly_value) },
                  { label: 'Vencimento', value: operator.d_subscriptionExpiresAt ? formatDate(operator.d_subscriptionExpiresAt) : 'Nao informado' },
                  { label: 'Cadastro', value: formatDate(operator.created_at) },
                ].map((row, index, array) => (
                  <div key={row.label}>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-muted-foreground">{row.label}</span>
                      <span className="text-sm">{row.value}</span>
                    </div>
                    {index < array.length - 1 ? <Separator className="mt-4" /> : null}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold">Dispositivo movel</h2>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <span className="text-sm">
                      {operator.device?.i_device_id ? 'Dispositivo vinculado' : 'Nenhum dispositivo vinculado'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Identificador</span>
                    <span className="text-sm">{operator.device?.i_device_id ?? '-'}</span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Nome do dispositivo</span>
                    <span className="text-sm">{operator.device?.v_device_name ?? '-'}</span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Pais</span>
                    <span className="text-sm">{operator.device?.v_device_country ?? '-'}</span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Ultimo acesso</span>
                    <span className="text-sm">{operator.device?.d_device_last_seen ? formatDate(operator.device.d_device_last_seen) : '-'}</span>
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold">Resumo operacional</h2>
              <Card className="grid gap-4 p-6 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Prepostos ativos</div>
                  <div className="mt-2 text-2xl font-semibold">{operator.active_prepostos_count}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Prepostos totais</div>
                  <div className="mt-2 text-2xl font-semibold">{operator.total_prepostos_count}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Veiculos privados</div>
                  <div className="mt-2 text-2xl font-semibold">{operator.private_vehicles_count}</div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Prepostos</h2>
          <Card className="p-6">
            <div className="overflow-auto rounded-lg border">
              <div className="grid grid-cols-[minmax(220px,3fr)_minmax(220px,3fr)_minmax(140px,1.2fr)_minmax(120px,1fr)] gap-4 border-b p-4 text-sm font-medium text-muted-foreground">
                <div>Nome</div>
                <div>E-mail</div>
                <div>Criado em</div>
                <div>Status</div>
              </div>
              {operator.prepostos.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  Nenhum preposto cadastrado
                </div>
              ) : (
                <div className="divide-y">
                  {operator.prepostos.map((preposto) => (
                    <div key={preposto.i_id} className="grid grid-cols-[minmax(220px,3fr)_minmax(220px,3fr)_minmax(140px,1.2fr)_minmax(120px,1fr)] gap-4 p-4 text-sm">
                      <div>{preposto.v_name}</div>
                      <div className="truncate text-muted-foreground">{preposto.v_email}</div>
                      <div className="text-muted-foreground">{formatDate(preposto.created_at)}</div>
                      <div>
                        <Badge variant={preposto.b_banned ? 'destructive' : 'secondary'}>
                          {preposto.b_banned ? 'Bloqueado' : 'Ativo'}
                        </Badge>
                      </div>
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
