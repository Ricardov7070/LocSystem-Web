import { z } from 'zod';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import { DateRangePicker } from '../../components/DateRangePicker';
import CustomAlert from '../../hooks/useCustomAlert';
import { formatCpfCnpj, formatPhone, stripNonDigits } from '../../lib/utils';
import Loading from '../../components/ui/Loading';

type Wallet = {
  i_id: number;
  v_name: string;
};

type LegalAdvisory = {
  i_id: number;
  v_name: string;
  v_document: string;
  v_phone: string;
  created_at: string;
  updated_at: string;
  vehicles_count: number;
  last_activity: string | null;
  wallet?: {
    i_id: number;
    v_name: string;
  } | null;
};

const legalAdvisorySchema = z.object({
  v_name: z.string().trim().min(1, 'Nome e obrigatorio').min(4, 'Nome deve ter no minimo 4 caracteres'),
  v_document: z.string().trim().min(1, 'Documento e obrigatorio').refine((value) => {
    const digits = stripNonDigits(value);
    return digits.length === 11 || digits.length === 14;
  }, 'Documento invalido'),
  v_phone: z.string().trim().min(1, 'Telefone e obrigatorio').refine((value) => {
    const digits = stripNonDigits(value);
    return digits.length === 10 || digits.length === 11;
  }, 'Telefone invalido'),
  i_wallet_id: z.string().min(1, 'Carteira e obrigatoria'),
});

type LegalAdvisoryFormSchema = z.infer<typeof legalAdvisorySchema>;

function LegalAdvisoryForm({
  form,
  wallets,
}: {
  form: UseFormReturn<LegalAdvisoryFormSchema>;
  wallets: Wallet[];
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="v_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="Nome da assessoria" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="v_document"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Documento (CPF/CNPJ) <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="CPF ou CNPJ"
                maxLength={18}
                {...field}
                onChange={(event) => field.onChange(formatCpfCnpj(event.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="v_phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefone <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                type="tel"
                placeholder="(00) 00000-0000"
                maxLength={15}
                {...field}
                onChange={(event) => field.onChange(formatPhone(event.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="i_wallet_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Carteira <span className="text-red-500">*</span></FormLabel>
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma carteira" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.i_id} value={String(wallet.i_id)}>
                    {wallet.v_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

const PAGE_SIZE = 10;
const COLS = 'grid-cols-[minmax(220px,2fr)_minmax(180px,1fr)_minmax(120px,120px)_minmax(180px,1fr)_minmax(180px,1fr)_120px]';

function SortIcon({
  colKey,
  sortKey,
  sortDir,
}: {
  colKey: string;
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
}) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

function formatTableDateTime(value: string | null | undefined) {
  if (!value) return '-';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return format(parsedDate, 'dd/MM/yyyy HH:mm');
}

function buildDefaultLegalAdvisoryDateRange(): DateRange {
  const now = new Date();

  return {
    from: subDays(now, 30),
    to: now,
  };
}

function LegalAdvisoriesTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => buildDefaultLegalAdvisoryDateRange());
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const { data: legalAdvisories, isLoading, isError, error } = useQuery<LegalAdvisory[]>({
    queryKey: ['legal-advisories', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const body: Record<string, string> = {};

      if (dateRange?.from && dateRange?.to) {
        body.data_inicial = format(dateRange.from, 'yyyy-MM-dd');
        body.data_final = format(dateRange.to, 'yyyy-MM-dd');
      }

      const response = await api.post('/legalAdvisories', body);
      return (response.data.legalAdvisory ?? response.data.data ?? response.data ?? []) as LegalAdvisory[];
    },
    throwOnError: false,
  });

  const fetchWallets = async () => {
    const response = await api.get('/wallets');
    return (response.data.wallets ?? response.data.wallet ?? response.data.data ?? response.data ?? []) as Wallet[];
  };

  useQuery<Wallet[]>({
    queryKey: ['wallets-options'],
    queryFn: fetchWallets,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.post('/registerLegalAdvisory', data);
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const response = await api.put(`/updateLegalAdvisory/${id}`, data);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/deleteLegalAdvisory/${id}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (!isError) return;
    const status = (error as any)?.response?.status;
    if (status === 500) {
      setAlertInfo({ message: 'Erro ao carregar assessorias.', type: 'error' });
    } else {
      setAlertInfo({ message: 'Falha inesperada ao conectar com a API.', type: 'error' });
    }
  }, [isError, error]);

  async function refreshLegalAdvisories() {
    await queryClient.invalidateQueries({ queryKey: ['legal-advisories'] });
    await queryClient.refetchQueries({ queryKey: ['legal-advisories'], type: 'active' });
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }

  async function handleAdd() {
    let walletOptions: Wallet[] = [];

    try {
      walletOptions = await fetchWallets();
      queryClient.setQueryData(['wallets-options'], walletOptions);
    } catch (err: any) {
      setAlertInfo({
        message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao carregar carteiras.',
        type: 'error',
      });
      return;
    }

    await dialog.form('Adicionar assessoria', {
      description: 'Preencha os dados da assessoria juridica',
      schema: legalAdvisorySchema,
      submitText: 'Salvar',
      defaultValues: {
        v_name: '',
        v_document: '',
        v_phone: '',
        i_wallet_id: '',
      },
      form: (form) => <LegalAdvisoryForm form={form} wallets={walletOptions} />,
      async handler({ form, data }) {
        try {
          const payload = {
            ...data,
            v_document: stripNonDigits(data.v_document),
            v_phone: stripNonDigits(data.v_phone),
            i_wallet_id: Number(data.i_wallet_id),
          };
          const response = await registerMutation.mutateAsync(payload);
          setAlertInfo({ message: response?.success ?? 'Assessoria criada com sucesso', type: 'success' });
          await refreshLegalAdvisories();
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof LegalAdvisoryFormSchema, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao cadastrar assessoria.', type: 'error' });
          throw new Error('Falha ao cadastrar assessoria');
        }
      },
    });
  }

  async function handleEdit(item: LegalAdvisory) {
    let walletOptions: Wallet[] = [];

    try {
      walletOptions = await fetchWallets();
      queryClient.setQueryData(['wallets-options'], walletOptions);
    } catch (err: any) {
      setAlertInfo({
        message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao carregar carteiras.',
        type: 'error',
      });
      return;
    }

    await dialog.form('Atualizar assessoria', {
      description: 'Atualize os dados da assessoria juridica',
      schema: legalAdvisorySchema,
      submitText: 'Atualizar',
      defaultValues: {
        v_name: item.v_name,
        v_document: formatCpfCnpj(item.v_document),
        v_phone: formatPhone(item.v_phone),
        i_wallet_id: item.wallet?.i_id ? String(item.wallet.i_id) : '',
      },
      form: (form) => <LegalAdvisoryForm form={form} wallets={walletOptions} />,
      async handler({ form, data }) {
        try {
          const payload = {
            ...data,
            v_document: stripNonDigits(data.v_document),
            v_phone: stripNonDigits(data.v_phone),
            i_wallet_id: Number(data.i_wallet_id),
          };
          const response = await updateMutation.mutateAsync({ id: item.i_id, data: payload });
          setAlertInfo({ message: response?.success ?? 'Assessoria atualizada com sucesso', type: 'success' });
          await refreshLegalAdvisories();
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof LegalAdvisoryFormSchema, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao atualizar assessoria.', type: 'error' });
          throw new Error('Falha ao atualizar assessoria');
        }
      },
    });
  }

  async function handleDelete(item: LegalAdvisory) {
    const confirmed = await dialog.confirm('Excluir assessoria', {
      description: `Deseja remover a assessoria ${item.v_name}?`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(item.i_id);
      setAlertInfo({ message: response?.success ?? 'Assessoria removida com sucesso', type: 'success' });
      await refreshLegalAdvisories();
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao excluir assessoria.', type: 'error' });
    }
  }

  const filtered = (legalAdvisories ?? []).filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch = [
      item.v_name,
      item.wallet?.v_name ?? '',
      item.v_document,
      item.v_phone,
    ].some((field) => field.toLowerCase().includes(term));

    if (!matchesSearch) return false;
    if (!dateRange?.from || !dateRange?.to) return true;
    if (!item.updated_at) return false;

    const updatedAt = new Date(item.updated_at);
    if (Number.isNaN(updatedAt.getTime())) return false;

    return updatedAt >= startOfDay(dateRange.from) && updatedAt <= endOfDay(dateRange.to);
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aValue = '';
        let bValue = '';

        if (sortKey === 'v_name') {
          aValue = a.v_name;
          bValue = b.v_name;
        } else if (sortKey === 'wallet') {
          aValue = a.wallet?.v_name ?? '';
          bValue = b.wallet?.v_name ?? '';
        } else if (sortKey === 'vehicles_count') {
          const aCount = a.vehicles_count ?? 0;
          const bCount = b.vehicles_count ?? 0;
          return sortDir === 'asc' ? aCount - bCount : bCount - aCount;
        } else if (sortKey === 'updated_at') {
          const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
        } else {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
        }

        return sortDir === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange]);

  return (
    <>
      {(registerMutation.isPending || updateMutation.isPending || deleteMutation.isPending) && <Loading />}
      {alertInfo && (
        <div className="fixed right-4 top-4 z-[9999]">
          <CustomAlert
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      )}

      <Topbar breadcrumbs={[{ label: 'Assessorias Juridicas' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Assessorias Juridicas</h1>
          <p className="text-muted-foreground">Gerenciamento de Assessorias Juridicas</p>
        </div>
        <div>
          <Button variant="primary" onClick={handleAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Assessoria
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              placeholder="Pesquisar por nome ou carteira..."
              className="w-64"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <DateRangePicker
              date={dateRange}
              onDateChange={(range) => setDateRange(range ?? buildDefaultLegalAdvisoryDateRange())}
              placeholder="Filtrar por Ultima Atualizacao"
              triggerSize="sm"
              triggerClassName="w-56 sm:w-60"
              align="end"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            A carga inicial exibe as assessorias criadas nos ultimos 30 dias. Use os filtros para refinar ou ampliar a consulta.
          </p>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className={`grid ${COLS} gap-4 p-4 text-sm font-medium text-muted-foreground`}>
                <button className="flex items-center gap-1" onClick={() => handleSort('v_name')}>
                  Nome <SortIcon colKey="v_name" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('wallet')}>
                  Carteira <SortIcon colKey="wallet" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('vehicles_count')}>
                  Qtd Placas <SortIcon colKey="vehicles_count" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('created_at')}>
                  Criado em <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('updated_at')}>
                  Ultima Atualizacao <SortIcon colKey="updated_at" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <div className="text-center">Ações</div>
              </div>
            </div>

            {isLoading ? (
              <DataTableSkeleton columnCount={6} rowCount={6} />
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                title="Nenhuma assessoria cadastrada"
                description="Voce ainda nao possui assessorias cadastradas."
                minHeightClassName="min-h-[404px]"
              />
            ) : (
              <div className="divide-y">
                {paginated.map((item) => (
                  <div key={item.i_id} className={`grid ${COLS} items-center gap-4 p-4 text-sm`}>
                    <Link to={`/legal-advisories/${item.i_id}`} className="font-medium hover:text-primary hover:underline">
                      {item.v_name}
                    </Link>
                    <div className="flex items-center justify-center gap-1 text-center text-muted-foreground">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Visualizar detalhes">
                        <Link to={`/legal-advisories/${item.i_id}`} aria-label={`Visualizar detalhes de ${item.v_name}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <span>{item.wallet?.v_name ?? 'Nao definida'}</span>
                    </div>
                    <div className="text-center">{item.vehicles_count ?? 0}</div>
                    <div className="text-center text-muted-foreground">
                      {formatTableDateTime(item.created_at)}
                    </div>
                    <div className="text-center">
                      <span className="inline-flex rounded-md border border-red-300 bg-red-50 px-2 py-1 text-red-700">
                        {formatTableDateTime(item.updated_at)}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild className="!text-blue-600 hover:!text-blue-600 focus:!text-blue-600 dark:!text-blue-400 dark:hover:!text-blue-400 dark:focus:!text-blue-400">
                            <Link to={`/legal-advisories/${item.i_id}`}>
                              <Eye className="mr-2 size-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="mr-2 size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => handleDelete(item)}>
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

          {!isLoading && sorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}-{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                  Anterior
                </Button>
                <span>{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                  Proxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function LegalAdvisoriesPage() {
  return <LegalAdvisoriesTable />;
}
