import { z } from 'zod';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

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
import { DateRangePicker } from '../../components/DateRangePicker';
import { LegalAdvisoryMultiSelectCombobox } from '../../components/ui/legal-advisory-multiselect-combobox';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';

type AdvisoryUser = {
  i_id: number;
  v_name: string;
  v_email: string;
  v_phone: string | null;
  b_banned: boolean;
  created_at: string;
  legalAdvisoryIds: string[];
  legalAdvisories: Array<{ id: string; name: string; wallet: { name: string } | null }>;
  isActive: boolean;
};

const advisoryUserFormSchema = z
  .object({
    v_name: z.string().min(1, 'Nome e obrigatorio'),
    v_email: z.string().email('Email invalido'),
    v_phone: z.string().min(10, 'Telefone invalido'),
    v_password: z.string().min(8, 'Minimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmacao obrigatoria'),
    legalAdvisoryIds: z.array(z.string()).min(1, 'Selecione ao menos uma assessoria'),
  })
  .refine((data) => data.v_password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });

type AdvisoryUserFormSchema = z.infer<typeof advisoryUserFormSchema>;

const advisoryUserEditSchema = z.object({
  v_name: z.string().min(1, 'Nome e obrigatorio'),
  v_email: z.string().email('Email invalido'),
  v_phone: z.string().min(10, 'Telefone invalido'),
  legalAdvisoryIds: z.array(z.string()).min(1, 'Selecione ao menos uma assessoria'),
});

type AdvisoryUserEditSchema = z.infer<typeof advisoryUserEditSchema>;

function AdvisoryUserForm({ form }: { form: UseFormReturn<AdvisoryUserFormSchema> }) {
  return (
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

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="v_password" render={({ field }) => (
          <FormItem>
            <FormLabel>Senha</FormLabel>
            <FormControl><Input type="password" placeholder="Senha" {...field} /></FormControl>
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
      </div>

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
  );
}

function AdvisoryUserEditForm({ form }: { form: UseFormReturn<AdvisoryUserEditSchema> }) {
  return (
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
  );
}

const PAGE_SIZE = 10;
const COLS = 'grid-cols-[minmax(220px,2fr)_minmax(220px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_80px]';

function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

export default function AdvisoryUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const { data: advisoryUsers, isLoading, isError, error } = useQuery<AdvisoryUser[]>({
    queryKey: ['advisory-users'],
    queryFn: async () => {
      const response = await api.get('/advisory-users');
      return (response.data.advisoryUsers ?? response.data.data ?? []) as AdvisoryUser[];
    },
    throwOnError: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post('/advisory-users', payload);
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const response = await api.put(`/advisory-users/${id}`, payload);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/advisory-users/${id}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (!isError) return;
    const status = (error as any)?.response?.status;
    if (status === 500) {
      setAlertInfo({ message: 'Erro ao carregar usuarios de assessoria.', type: 'error' });
    } else {
      setAlertInfo({ message: 'Falha inesperada ao conectar com a API.', type: 'error' });
    }
  }, [isError, error]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((v) => (v === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }

  async function onAdd() {
    await dialog.form('Adicionar Usuario de Assessoria', {
      description: 'Preencha os dados do usuario',
      schema: advisoryUserFormSchema,
      submitText: 'Adicionar Usuario',
      defaultValues: {
        v_name: '',
        v_email: '',
        v_phone: '',
        v_password: '',
        confirmPassword: '',
        legalAdvisoryIds: [],
      },
      form: (form) => <AdvisoryUserForm form={form} />,
      async handler({ form, data }) {
        try {
          const payload = {
            v_name: data.v_name,
            v_email: data.v_email,
            v_phone: data.v_phone,
            v_password: data.v_password,
            legalAdvisoryIds: data.legalAdvisoryIds.map((id) => Number(id)),
          };
          const response = await createMutation.mutateAsync(payload);
          setAlertInfo({ message: response?.success ?? 'Usuario adicionado com sucesso', type: 'success' });
          queryClient.invalidateQueries({ queryKey: ['advisory-users'] });
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof AdvisoryUserFormSchema, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao cadastrar usuario.', type: 'error' });
          throw new Error('Falha ao cadastrar');
        }
      },
    });
  }

  async function onEdit(item: AdvisoryUser) {
    await dialog.form('Editar Usuario de Assessoria', {
      description: 'Atualize os dados do usuario',
      schema: advisoryUserEditSchema,
      submitText: 'Salvar alteracoes',
      defaultValues: {
        v_name: item.v_name,
        v_email: item.v_email,
        v_phone: item.v_phone ?? '',
        legalAdvisoryIds: item.legalAdvisoryIds ?? [],
      },
      form: (form) => <AdvisoryUserEditForm form={form} />,
      async handler({ form, data }) {
        try {
          const payload = {
            v_name: data.v_name,
            v_email: data.v_email,
            v_phone: data.v_phone,
            legalAdvisoryIds: data.legalAdvisoryIds.map((id) => Number(id)),
          };
          const response = await updateMutation.mutateAsync({ id: item.i_id, payload });
          setAlertInfo({ message: response?.success ?? 'Usuario atualizado com sucesso', type: 'success' });
          queryClient.invalidateQueries({ queryKey: ['advisory-users'] });
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof AdvisoryUserEditSchema, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao atualizar usuario.', type: 'error' });
          throw new Error('Falha ao atualizar');
        }
      },
    });
  }

  async function onDelete(item: AdvisoryUser) {
    const confirmed = await dialog.confirm('Excluir Usuario', {
      description: `Deseja excluir o usuario ${item.v_name}?`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(item.i_id);
      setAlertInfo({ message: response?.success ?? 'Usuario removido com sucesso', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['advisory-users'] });
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao excluir usuario.', type: 'error' });
    }
  }

  const filtered = (advisoryUsers ?? []).filter((user) => {
    const term = search.toLowerCase();
    return [
      user.v_name,
      user.v_email,
      String(user.legalAdvisoryIds?.length ?? 0),
    ].some((field) => field.toLowerCase().includes(term));
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        if (sortKey === 'created_at') {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
        }

        if (sortKey === 'assessorias') {
          const aCount = a.legalAdvisoryIds?.length ?? 0;
          const bCount = b.legalAdvisoryIds?.length ?? 0;
          return sortDir === 'asc' ? aCount - bCount : bCount - aCount;
        }

        const aValue = sortKey === 'v_name' ? a.v_name : a.v_email;
        const bValue = sortKey === 'v_name' ? b.v_name : b.v_email;
        return sortDir === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <>
      {(createMutation.isPending || updateMutation.isPending || deleteMutation.isPending) && <Loading />}
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      )}

      <Topbar breadcrumbs={[{ label: 'Usuarios de Assessoria' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Usuarios de Assessoria</h1>
          <p className="text-muted-foreground">Gerenciamento de Usuarios com Acesso a Assessorias Juridicas</p>
        </div>
        <div>
          <Button variant="primary" onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Usuario
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              placeholder="Pesquisar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <DateRangePicker placeholder="Selecione as datas" triggerSize="sm" triggerClassName="w-56 sm:w-60" align="end" />
          </div>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className={`grid ${COLS} gap-4 p-4 font-medium text-muted-foreground text-sm`}>
                <button className="flex items-center gap-1" onClick={() => handleSort('v_name')}>
                  Nome <SortIcon colKey="v_name" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('v_email')}>
                  E-mail <SortIcon colKey="v_email" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('assessorias')}>
                  Assessorias <SortIcon colKey="assessorias" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('created_at')}>
                  Cadastrado em <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <div className="text-center">Acoes</div>
              </div>
            </div>

            {isLoading ? (
              <DataTableSkeleton columnCount={5} rowCount={6} />
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                title="Nenhum usuario de assessoria cadastrado"
                description="Voce ainda nao possui usuarios de assessoria cadastrados."
                minHeightClassName="min-h-[404px]"
              />
            ) : (
              <div className="divide-y">
                {paginated.map((user) => (
                  <div key={user.i_id} className={`grid ${COLS} gap-4 p-4 text-sm items-center`}>
                    <Link to={`/users/advisory-users/${user.i_id}`} className="font-medium hover:text-primary hover:underline">
                      {user.v_name}
                    </Link>
                    <div className="text-center text-muted-foreground">{user.v_email}</div>
                    <div className="text-center text-muted-foreground">{user.legalAdvisoryIds?.length ?? 0}</div>
                    <div className="text-center text-muted-foreground">{format(new Date(user.created_at), 'dd/MM/yyyy')}</div>
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(user)}>
                            <Pencil className="mr-2 size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => onDelete(user)}>
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
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Anterior
                </Button>
                <span>{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
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
