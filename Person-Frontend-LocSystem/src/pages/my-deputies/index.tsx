import { z } from 'zod';
import { format } from 'date-fns';
import { Ban, CheckCheck, Ellipsis, Plus, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { type DateRange } from 'react-day-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { useAuth } from '../../components/providers/auth';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
} from '../../components/ui/form';
import { DateRangePicker } from '../../components/DateRangePicker';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import Loading from '../../components/ui/Loading';
import { formatPhone, stripNonDigits } from '../../lib/utils';

type DeputyRecord = {
  i_id: number;
  v_name: string;
  v_email: string;
  v_phone: string | null;
  e_role: string;
  e_approval_status: string | null;
  b_banned: boolean;
  b_twoFactorEnabled: boolean;
  created_at: string;
  operator?: {
    i_id: number;
    v_name: string;
    v_email: string;
  } | null;
};

const blockReasonSchema = z.object({
  reason: z.string().optional(),
});

const successMenuItemClass =
  'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 dark:focus:bg-emerald-950/40 dark:focus:text-emerald-300';

const warningMenuItemClass =
  'text-amber-600 hover:bg-amber-50 hover:text-amber-700 focus:bg-amber-50 focus:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 dark:focus:bg-amber-950/40 dark:focus:text-amber-300';

const dangerMenuItemClass =
  'text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 dark:focus:bg-red-950/40 dark:focus:text-red-300';

const prepostoFormSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação obrigatória'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });
type PrepostoFormSchema = z.infer<typeof prepostoFormSchema>;

function PrepostoForm({ form }: { form: UseFormReturn<PrepostoFormSchema> }) {
  return (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem><FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="email" render={({ field }) => (
        <FormItem><FormLabel>E-mail <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="phone" render={({ field }) => (
        <FormItem><FormLabel>Telefone <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Senha <span className="text-red-500">*</span></FormLabel>
            <FormControl><Input type="password" placeholder="Senha" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem><FormLabel>Confirmar senha <span className="text-red-500">*</span></FormLabel>
            <FormControl><Input type="password" placeholder="Confirmar senha" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </>
  );
}

function getStatusLabel(deputy: DeputyRecord) {
  if (deputy.e_approval_status !== 'APPROVED') return 'Pendente de Aprovacao';
  return deputy.b_banned ? 'Bloqueado' : 'Ativo';
}

function getStatusBadgeClass(deputy: DeputyRecord) {
  if (deputy.e_approval_status !== 'APPROVED') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  return deputy.b_banned
    ? 'bg-red-50 text-red-700 ring-red-200'
    : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
}

export default function MyDeputiesPage() {
  const { user } = useAuth();
  const isAdmin = user.role?.trim().toUpperCase() === 'ADMIN';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const approvalMutation = useMutation({
    mutationFn: async (deputyId: number) => {
      const response = await api.patch(`/my-deputies/${deputyId}/approval`);
      return response.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ deputyId, payload }: { deputyId: number; payload: Record<string, unknown> }) => {
      const response = await api.patch(`/my-deputies/${deputyId}/status`, payload);
      return response.data;
    },
  });

  const reset2FAMutation = useMutation({
    mutationFn: async (deputyId: number) => {
      const response = await api.post(`/my-deputies/${deputyId}/reset-2fa`);
      return response.data;
    },
  });

  const { data: deputies = [], isLoading, isFetching } = useQuery<DeputyRecord[]>({
    queryKey: ['my-deputies', search, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const params: Record<string, string> = {};
      const normalizedSearch = search.trim();

      if (normalizedSearch) {
        params.search = normalizedSearch;
      }

      if (dateRange?.from) {
        params.data_inicial = format(dateRange.from, 'yyyy-MM-dd');
      }

      if (dateRange?.to) {
        params.data_final = format(dateRange.to, 'yyyy-MM-dd');
      }

      const response = await api.get('/my-deputies', { params });
      return (response.data.deputies ?? []) as DeputyRecord[];
    },
  });

  async function refreshDeputies() {
    await queryClient.invalidateQueries({ queryKey: ['my-deputies'] });
  }

  async function onAdd() {
    const response = await dialog.form('Adicionar Preposto', {
      description: 'Preencha as informações para adicionar um novo preposto',
      schema: prepostoFormSchema,
      submitText: 'Adicionar Preposto',
      defaultValues: {
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      },
      form: (form) => <PrepostoForm form={form} />,
      async handler({ form, data }) {
        try {
          const result = await api.post('/my-deputies', {
            v_name: data.name.trim(),
            v_email: data.email.trim(),
            v_phone: stripNonDigits(data.phone),
            v_password: data.password,
          });

          await queryClient.invalidateQueries({ queryKey: ['my-deputies'] });
          return result.data;
        } catch (error: any) {
          const errors = error?.response?.data?.errors as Record<string, string[]> | undefined;

          if (errors?.v_name?.[0]) form.setError('name', { message: errors.v_name[0] });
          if (errors?.v_email?.[0]) form.setError('email', { message: errors.v_email[0] });
          if (errors?.v_phone?.[0]) form.setError('phone', { message: errors.v_phone[0] });
          if (errors?.v_password?.[0]) form.setError('password', { message: errors.v_password[0] });

          if (errors) {
            throw new Error('Falha de validacao');
          }

          throw new Error(
            error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao cadastrar preposto.'
          );
        }
      },
    });

    if (response) {
      toast.success('Preposto adicionado com sucesso');
    }
  }

  async function handleApprove(deputy: DeputyRecord) {
    if (!isAdmin || deputy.e_approval_status === 'APPROVED') return;

    const confirmed = await dialog.confirm('Aprovar olheiro', {
      description: `Deseja aprovar o olheiro ${deputy.v_name} para acesso ao sistema?`,
      actionText: 'Aprovar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await approvalMutation.mutateAsync(deputy.i_id);
      toast.success('Olheiro aprovado com sucesso');
      await refreshDeputies();
    } catch (error: any) {
      toast.error(error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao aprovar olheiro.');
    }
  }

  async function handleToggleStatus(deputy: DeputyRecord) {
    if (!isAdmin) return;

    if (deputy.b_banned) return;

    await dialog.form('Bloquear olheiro', {
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
            deputyId: deputy.i_id,
            payload: { isActive: false, reason: data.reason || null },
          });
          await refreshDeputies();
          return response;
        } catch (error: any) {
          throw new Error(error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao bloquear olheiro.');
        }
      },
    });

    toast.success('Olheiro bloqueado com sucesso');
  }

  async function handleReset2FA(deputy: DeputyRecord) {
    if (!isAdmin) return;

    const confirmed = await dialog.confirm('Resetar 2FA', {
      description: `Deseja resetar o 2FA do olheiro ${deputy.v_name}?`,
      actionText: 'Resetar 2FA',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await reset2FAMutation.mutateAsync(deputy.i_id);
      toast.success('2FA do olheiro resetado com sucesso');
      await refreshDeputies();
    } catch (error: any) {
      toast.error(error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao resetar 2FA do olheiro.');
    }
  }

  const columnsClassName = isAdmin
    ? 'grid-cols-[minmax(180px,2fr)_minmax(180px,2fr)_minmax(130px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_80px]'
    : 'grid-cols-[minmax(180px,2fr)_minmax(220px,2.3fr)_minmax(130px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_80px]';

  return (
    <>
      {(isLoading || isFetching) && <Loading />}
      <Topbar breadcrumbs={[{ label: 'Meus Prepostos' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Meus Prepostos</h1>
          <p className="text-muted-foreground">Gerencie os usuários do tipo olheiro.</p>
        </div>
        {!isAdmin ? (
          <div>
            <Button variant="primary" onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Preposto
            </Button>
          </div>
        ) : null}
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              placeholder="Pesquisar por nome..."
              className="w-64"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <DateRangePicker
              placeholder="Selecione as datas"
              triggerSize="sm"
              triggerClassName="w-56 sm:w-60"
              align="end"
              date={dateRange}
              onDateChange={setDateRange}
            />
          </div>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className={`grid ${columnsClassName} gap-4 p-4 font-medium text-muted-foreground text-sm`}>
                <div>Nome</div>
                <div className="text-center">{isAdmin ? 'Operador' : 'E-mail'}</div>
                <div className="text-center">Telefone</div>
                <div className="text-center">Status</div>
                <div className="text-center">Cadastrado em</div>
                <div className="text-center">Ações</div>
              </div>
            </div>
            {isLoading ? (
              <div className="p-4">
                <DataTableSkeleton columnCount={6} rowCount={6} />
              </div>
            ) : deputies.length === 0 ? (
              <DataTableEmptyState
                title="Nenhum preposto cadastrado"
                description={isAdmin ? 'Nenhum olheiro encontrado para gerenciamento.' : 'Cadastre um novo olheiro para começar a gerenciar seus prepostos.'}
              />
            ) : (
              deputies.map((deputy) => (
                <div
                  key={deputy.i_id}
                  className={`grid ${columnsClassName} gap-4 border-b p-4 text-sm last:border-b-0`}
                >
                  <div className="font-medium">{deputy.v_name}</div>
                  <div className="text-center text-muted-foreground">
                    {isAdmin ? deputy.operator?.v_name ?? '-' : deputy.v_email}
                  </div>
                  <div className="text-center">{deputy.v_phone ? formatPhone(deputy.v_phone) : '-'}</div>
                  <div className="text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusBadgeClass(deputy)}`}>
                      {getStatusLabel(deputy)}
                    </span>
                  </div>
                  <div className="text-center">{deputy.created_at ? new Date(deputy.created_at).toLocaleDateString('pt-BR') : '-'}</div>
                  <div className="flex justify-center">
                    {isAdmin ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="size-8">
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {deputy.e_approval_status !== 'APPROVED' ? (
                            <DropdownMenuItem onClick={() => handleApprove(deputy)} className={successMenuItemClass}>
                              <CheckCheck className="mr-2 size-4" />
                              Aprovar olheiro
                            </DropdownMenuItem>
                          ) : null}
                          {deputy.b_twoFactorEnabled ? (
                            <DropdownMenuItem onClick={() => handleReset2FA(deputy)} className={warningMenuItemClass}>
                              <ShieldAlert className="mr-2 size-4" />
                              Resetar 2FA
                            </DropdownMenuItem>
                          ) : null}
                          {!deputy.b_banned ? (
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(deputy)}
                              className={dangerMenuItemClass}
                            >
                              <Ban className="mr-2 size-4" />
                              Bloquear
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
