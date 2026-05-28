import { z } from 'zod';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { DateRangePicker } from '../../components/DateRangePicker';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';
import {
  OperatorEditValues,
  operatorEditSchema,
  OperatorForm,
  operatorFormSchema,
  type PricingPlanOption,
} from './operator-form';
import { formatCpfCnpj, formatDate, formatPhone, stripNonDigits } from '../../lib/utils';

type OperatorRecord = {
  i_id: number;
  v_name: string;
  v_email: string;
  v_document: string | null;
  v_phone: string | null;
  e_approval_status: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  b_banned: boolean;
  b_is_courtesy: boolean;
  e_subscriptionStatus: 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  d_subscriptionExpiresAt: string | null;
  i_user_limit: number;
  active_prepostos_count: number;
  total_prepostos_count: number;
  private_vehicles_count: number;
  created_at: string;
  pricingPlan: PricingPlanOption | null;
  f_total_monthly_value: number | null;
};

type AlertState = {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
};

type SortKey =
  | 'v_name'
  | 'status'
  | 'access'
  | 'active_prepostos_count'
  | 'private_vehicles_count'
  | 'plan'
  | 'f_total_monthly_value'
  | 'created_at';

const PAGE_SIZE = 10;
const COLS =
  'grid-cols-[minmax(220px,2.2fr)_minmax(140px,1fr)_minmax(130px,1fr)_minmax(120px,1fr)_minmax(110px,0.8fr)_minmax(180px,1.3fr)_minmax(140px,1fr)_minmax(150px,1fr)_80px]';

function SortIcon({
  colKey,
  sortKey,
  sortDir,
}: {
  colKey: SortKey;
  sortKey: SortKey | null;
  sortDir: 'asc' | 'desc';
}) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return 'Cortesia';
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getAccessTypeLabel(operator: OperatorRecord) {
  return operator.b_is_courtesy ? 'Cortesia' : 'Mensalista';
}

function getStatusLabel(operator: OperatorRecord) {
  if (operator.e_approval_status !== 'APPROVED') return 'Pendente de Aprovacao';
  if (operator.b_banned) return 'Bloqueado';
  if (operator.b_is_courtesy) return 'Ativa';

  const labels: Record<OperatorRecord['e_subscriptionStatus'], string> = {
    ACTIVE: 'Ativa',
    CANCELED: 'Cancelada',
    INACTIVE: 'Inativa',
    PAST_DUE: 'Expirada',
  };

  return labels[operator.e_subscriptionStatus] ?? operator.e_subscriptionStatus;
}

function getStatusBadgeClass(operator: OperatorRecord) {
  if (operator.e_approval_status !== 'APPROVED') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (operator.b_banned) return 'bg-red-50 text-red-700 ring-red-200';
  if (operator.b_is_courtesy || operator.e_subscriptionStatus === 'ACTIVE') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (operator.e_subscriptionStatus === 'PAST_DUE') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

async function fetchPricingPlans() {
  const response = await api.get('/pricingPlans');
  return (response.data.pricingPlans ?? response.data.data ?? []) as PricingPlanOption[];
}

function buildOperatorsParams({
  search,
  dateRange,
  accessType,
  subscriptionStatus,
}: {
  search: string;
  dateRange: DateRange | undefined;
  accessType: string;
  subscriptionStatus: string;
}) {
  return {
    search: search.trim() || undefined,
    data_inicial: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    data_final: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    access_type: accessType !== 'all' ? accessType : undefined,
    subscription_status: subscriptionStatus !== 'all' ? subscriptionStatus : undefined,
  };
}

export default function OperatorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [accessType, setAccessType] = useState('all');
  const [subscriptionStatus, setSubscriptionStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [alertInfo, setAlertInfo] = useState<AlertState | null>(null);

  const { data: operators = [], isLoading, isError, error } = useQuery<OperatorRecord[]>({
    queryKey: ['operators', search, dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), accessType, subscriptionStatus],
    queryFn: async () => {
      const response = await api.get('/operators', {
        params: buildOperatorsParams({ search, dateRange, accessType, subscriptionStatus }),
      });

      return (response.data.operators ?? response.data.data ?? []) as OperatorRecord[];
    },
    throwOnError: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post('/operators', payload);
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const response = await api.put(`/operators/${id}`, payload);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/operators/${id}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (!isError) return;

    setAlertInfo({
      message:
        (error as any)?.response?.data?.info ??
        (error as any)?.response?.data?.error ??
        'Erro ao carregar localizadores.',
      type: 'error',
    });
  }, [isError, error]);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange?.from, dateRange?.to, accessType, subscriptionStatus]);

  function handleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(column);
    setSortDir(column === 'created_at' ? 'desc' : 'asc');
  }

  async function refreshOperators() {
    await queryClient.invalidateQueries({ queryKey: ['operators'] });
  }

  async function openCreateDialog() {
    let pricingPlans: PricingPlanOption[] = [];

    try {
      pricingPlans = await fetchPricingPlans();
    } catch (fetchError: any) {
      setAlertInfo({
        message:
          fetchError?.response?.data?.info ??
          fetchError?.response?.data?.error ??
          'Erro ao carregar planos de precificacao.',
        type: 'error',
      });
      return;
    }

    await dialog.form('Adicionar localizador', {
      description: 'Preencha os dados do localizador',
      schema: operatorFormSchema,
      submitText: 'Salvar',
      defaultValues: {
        v_name: '',
        v_email: '',
        v_document: '',
        v_phone: '',
        v_password: '',
        confirmPassword: '',
        i_user_limit: 0,
        b_is_courtesy: false,
        i_pricing_plan_id: '',
      },
      form: (form) => <OperatorForm form={form} pricingPlans={pricingPlans} />,
      async handler({ form, data }) {
        try {
          const payload = {
            v_name: data.v_name,
            v_email: data.v_email,
            v_document: stripNonDigits(data.v_document),
            v_phone: stripNonDigits(data.v_phone),
            v_password: data.v_password,
            i_user_limit: data.i_user_limit,
            b_is_courtesy: data.b_is_courtesy,
            i_pricing_plan_id: data.b_is_courtesy ? null : Number(data.i_pricing_plan_id),
          };

          const response = await createMutation.mutateAsync(payload);
          setAlertInfo({ message: response?.success ?? 'Localizador cadastrado com sucesso.', type: 'success' });
          await refreshOperators();
          return response;
        } catch (mutationError: any) {
          const fieldMap: Record<string, keyof z.infer<typeof operatorFormSchema>> = {
            v_name: 'v_name',
            v_email: 'v_email',
            v_document: 'v_document',
            v_phone: 'v_phone',
            v_password: 'v_password',
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
              mutationError?.response?.data?.info ??
              mutationError?.response?.data?.error ??
              'Erro ao cadastrar localizador.',
            type: 'error',
          });
          throw new Error('Falha ao cadastrar localizador');
        }
      },
    });
  }

  async function openEditDialog(operator: OperatorRecord) {
    let pricingPlans: PricingPlanOption[] = [];

    try {
      pricingPlans = await fetchPricingPlans();
    } catch (fetchError: any) {
      setAlertInfo({
        message:
          fetchError?.response?.data?.info ??
          fetchError?.response?.data?.error ??
          'Erro ao carregar planos de precificacao.',
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

          const response = await updateMutation.mutateAsync({ id: operator.i_id, payload });
          setAlertInfo({ message: response?.success ?? 'Localizador atualizado com sucesso.', type: 'success' });
          await refreshOperators();
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
              mutationError?.response?.data?.info ??
              mutationError?.response?.data?.error ??
              'Erro ao atualizar localizador.',
            type: 'error',
          });
          throw new Error('Falha ao atualizar localizador');
        }
      },
    });
  }

  async function handleDelete(operator: OperatorRecord) {
    const confirmed = await dialog.confirm('Excluir localizador', {
      description: `Deseja remover o localizador ${operator.v_name}?`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(operator.i_id);
      setAlertInfo({ message: response?.success ?? 'Localizador removido com sucesso.', type: 'success' });
      await refreshOperators();
    } catch (mutationError: any) {
      setAlertInfo({
        message:
          mutationError?.response?.data?.info ??
          mutationError?.response?.data?.error ??
          'Erro ao remover localizador.',
        type: 'error',
      });
    }
  }

  const sortedOperators = [...operators].sort((left, right) => {
    if (!sortKey) return 0;

    const leftValue = (() => {
      switch (sortKey) {
        case 'v_name':
          return left.v_name;
        case 'status':
          return getStatusLabel(left);
        case 'access':
          return getAccessTypeLabel(left);
        case 'active_prepostos_count':
          return left.active_prepostos_count;
        case 'private_vehicles_count':
          return left.private_vehicles_count;
        case 'plan':
          return left.pricingPlan?.v_name ?? '';
        case 'f_total_monthly_value':
          return left.f_total_monthly_value ?? -1;
        case 'created_at':
          return new Date(left.created_at).getTime();
      }
    })();

    const rightValue = (() => {
      switch (sortKey) {
        case 'v_name':
          return right.v_name;
        case 'status':
          return getStatusLabel(right);
        case 'access':
          return getAccessTypeLabel(right);
        case 'active_prepostos_count':
          return right.active_prepostos_count;
        case 'private_vehicles_count':
          return right.private_vehicles_count;
        case 'plan':
          return right.pricingPlan?.v_name ?? '';
        case 'f_total_monthly_value':
          return right.f_total_monthly_value ?? -1;
        case 'created_at':
          return new Date(right.created_at).getTime();
      }
    })();

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return sortDir === 'asc' ? leftValue - rightValue : rightValue - leftValue;
    }

    const leftText = String(leftValue ?? '');
    const rightText = String(rightValue ?? '');
    return sortDir === 'asc'
      ? leftText.localeCompare(rightText, 'pt-BR')
      : rightText.localeCompare(leftText, 'pt-BR');
  });

  const totalPages = Math.max(1, Math.ceil(sortedOperators.length / PAGE_SIZE));
  const paginatedOperators = sortedOperators.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {(createMutation.isPending || updateMutation.isPending || deleteMutation.isPending) && <Loading />}
      {alertInfo ? (
        <div className="fixed right-4 top-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      ) : null}

      <Topbar breadcrumbs={[{ label: 'Localizadores' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Localizadores</h1>
          <p className="text-muted-foreground">
            Gerenciamento de localizadores e prepostos
            <span className="ml-2 font-medium text-blue-600">({operators.length} cadastrado{operators.length === 1 ? '' : 's'})</span>
          </p>
        </div>

        <Button variant="primary" onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          Adicionar Localizador
        </Button>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Pesquisar por nome, e-mail ou documento..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-72"
              />

              <Select
                value={accessType}
                onValueChange={(value) => {
                  setAccessType(value);
                  if (value === 'courtesy') {
                    setSubscriptionStatus('all');
                  }
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos os acessos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os acessos</SelectItem>
                  <SelectItem value="monthly">Mensalista</SelectItem>
                  <SelectItem value="courtesy">Cortesia</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={subscriptionStatus}
                onValueChange={setSubscriptionStatus}
                disabled={accessType === 'courtesy'}
              >
                <SelectTrigger className="w-[140px] disabled:opacity-50">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="past_due">Expirada</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DateRangePicker
              date={dateRange}
              onDateChange={(range) => setDateRange(range ?? undefined)}
              placeholder="Filtrar por cadastro"
              triggerSize="sm"
              triggerClassName="w-56 sm:w-60"
              align="end"
            />
          </div>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="min-w-[1520px]">
              <div className="sticky top-0 z-10 border-b bg-background">
                <div className={`grid ${COLS} gap-4 p-4 text-sm font-medium text-muted-foreground`}>
                  <button type="button" className="flex items-center gap-1 text-left" onClick={() => handleSort('v_name')}>
                    Nome
                    <SortIcon colKey="v_name" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center justify-center gap-1" onClick={() => handleSort('status')}>
                    Status
                    <SortIcon colKey="status" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center justify-center gap-1" onClick={() => handleSort('access')}>
                    Tipo de acesso
                    <SortIcon colKey="access" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center justify-center gap-1" onClick={() => handleSort('active_prepostos_count')}>
                    Prepostos
                    <SortIcon colKey="active_prepostos_count" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center justify-center gap-1" onClick={() => handleSort('private_vehicles_count')}>
                    Qtd placas
                    <SortIcon colKey="private_vehicles_count" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center justify-center gap-1" onClick={() => handleSort('plan')}>
                    Plano
                    <SortIcon colKey="plan" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center justify-center gap-1" onClick={() => handleSort('f_total_monthly_value')}>
                    Valor mensal
                    <SortIcon colKey="f_total_monthly_value" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center justify-center gap-1" onClick={() => handleSort('created_at')}>
                    Criado em
                    <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <div className="text-center">Ações</div>
                </div>
              </div>

              {isLoading ? (
                <DataTableSkeleton columnCount={8} rowCount={6} />
              ) : paginatedOperators.length === 0 ? (
                <DataTableEmptyState
                  title="Nenhum localizador encontrado"
                  description="Nao ha localizadores cadastrados para os filtros informados."
                  minHeightClassName="min-h-[404px]"
                />
              ) : (
                <div className="divide-y">
                  {paginatedOperators.map((operator) => (
                    <div key={operator.i_id} className={`grid ${COLS} items-center gap-4 p-4 text-sm`}>
                      <div className="min-w-0">
                        <Link to={`/users/operators/${operator.i_id}`} className="truncate font-medium hover:text-primary hover:underline">
                          {operator.v_name}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">{operator.v_email}</div>
                        <div className="truncate text-xs text-muted-foreground">{formatCpfCnpj(operator.v_document ?? '')}</div>
                      </div>

                      <div className="flex justify-center">
                        <span className={`inline-flex min-w-[116px] items-center justify-center rounded-full px-2 py-0.5 text-center text-[11px] font-medium leading-tight ring-1 ${getStatusBadgeClass(operator)}`}>
                          {getStatusLabel(operator)}
                        </span>
                      </div>

                      <div className="text-center text-muted-foreground">{getAccessTypeLabel(operator)}</div>
                      <div className="text-center text-muted-foreground">{operator.active_prepostos_count} / {operator.i_user_limit}</div>
                      <div className="text-center text-muted-foreground">{operator.private_vehicles_count}</div>
                      <div className="text-center text-muted-foreground">{operator.pricingPlan?.v_name ?? 'Cortesia'}</div>
                      <div className="text-center text-muted-foreground">{formatCurrency(operator.f_total_monthly_value)}</div>
                      <div className="text-center text-muted-foreground">{formatDate(operator.created_at)}</div>

                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild className="!text-blue-600 hover:!text-blue-600 focus:!text-blue-600 dark:!text-blue-400 dark:hover:!text-blue-400 dark:focus:!text-blue-400">
                              <Link to={`/users/operators/${operator.i_id}`}>
                                <Eye className="mr-2 size-4" />
                                Visualizar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(operator)}>
                              <Pencil className="mr-2 size-4" />
                              Atualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => handleDelete(operator)}>
                              <Trash2 className="mr-2 size-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!isLoading && sortedOperators.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sortedOperators.length)}-{Math.min(page * PAGE_SIZE, sortedOperators.length)} de {sortedOperators.length}
              </span>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                  Anterior
                </Button>
                <span>{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
                  Proxima
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
