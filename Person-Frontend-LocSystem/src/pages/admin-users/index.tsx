import { z } from 'zod';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { type DateRange } from 'react-day-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

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
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';

type AdminUser = {
  i_id: number;
  v_name: string;
  v_email: string;
  v_phone: string | null;
  e_approval_status: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  b_banned: boolean;
  created_at: string;
  isActive: boolean;
  isPrimaryAdmin: boolean;
};

const PHONE_MAX_DIGITS = 11;
const PHONE_MAX_LENGTH = 15;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 50;

function limitName(value: string) {
  return value.slice(0, NAME_MAX_LENGTH);
}

function limitEmail(value: string) {
  return value.slice(0, EMAIL_MAX_LENGTH);
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
}

function formatPhoneValue(value: string) {
  const digits = normalizePhoneDigits(value);

  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const adminUserFormSchema = z
  .object({
    v_name: z.string().trim().min(1, 'Nome e obrigatorio').max(NAME_MAX_LENGTH, 'Nome deve ter no maximo 100 caracteres'),
    v_email: z.string().trim().min(1, 'Email e obrigatorio').max(EMAIL_MAX_LENGTH, 'Email deve ter no maximo 50 caracteres').email('Email invalido'),
    v_phone: z.string().max(PHONE_MAX_LENGTH, 'Telefone invalido').refine((value) => {
      const digits = normalizePhoneDigits(value);
      return digits.length >= 10 && digits.length <= PHONE_MAX_DIGITS;
    }, 'Telefone invalido'),
    v_password: z.string().min(8, 'Minimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmacao obrigatoria'),
  })
  .refine((data) => data.v_password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });

type AdminUserFormSchema = z.infer<typeof adminUserFormSchema>;

const adminUserEditSchema = z.object({
  v_name: z.string().trim().min(1, 'Nome e obrigatorio').max(NAME_MAX_LENGTH, 'Nome deve ter no maximo 100 caracteres'),
  v_email: z.string().trim().min(1, 'Email e obrigatorio').max(EMAIL_MAX_LENGTH, 'Email deve ter no maximo 50 caracteres').email('Email invalido'),
  v_phone: z.string().max(PHONE_MAX_LENGTH, 'Telefone invalido').refine((value) => {
    const digits = normalizePhoneDigits(value);
    return digits.length >= 10 && digits.length <= PHONE_MAX_DIGITS;
  }, 'Telefone invalido'),
});

type AdminUserEditSchema = z.infer<typeof adminUserEditSchema>;

function RequiredLabel({ children }: { children: string }) {
  return (
    <>
      {children}
      <span className="ml-1 text-red-500">*</span>
    </>
  );
}

function AdminUserForm({ form }: { form: UseFormReturn<AdminUserFormSchema> }) {
  return (
    <>
      <FormField control={form.control} name="v_name" render={({ field }) => (
        <FormItem>
          <FormLabel><RequiredLabel>Nome</RequiredLabel></FormLabel>
          <FormControl>
            <Input
              placeholder="Nome completo"
              maxLength={NAME_MAX_LENGTH}
              {...field}
              value={typeof field.value === 'string' ? limitName(field.value) : ''}
              onChange={(event) => {
                const nextValue = limitName(event.target.value);
                event.target.value = nextValue;
                field.onChange(nextValue);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="v_email" render={({ field }) => (
        <FormItem>
          <FormLabel><RequiredLabel>E-mail</RequiredLabel></FormLabel>
          <FormControl>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              maxLength={EMAIL_MAX_LENGTH}
              {...field}
              value={typeof field.value === 'string' ? limitEmail(field.value) : ''}
              onChange={(event) => {
                const nextValue = limitEmail(event.target.value);
                event.target.value = nextValue;
                field.onChange(nextValue);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="v_phone" render={({ field }) => (
        <FormItem>
          <FormLabel><RequiredLabel>Telefone</RequiredLabel></FormLabel>
          <FormControl>
            <Input
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PHONE_MAX_LENGTH}
              value={field.value ?? ''}
              onChange={(event) => field.onChange(formatPhoneValue(event.target.value))}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="v_password" render={({ field }) => (
          <FormItem>
            <FormLabel><RequiredLabel>Senha</RequiredLabel></FormLabel>
            <FormControl><Input type="password" placeholder="Senha" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem>
            <FormLabel><RequiredLabel>Confirmar senha</RequiredLabel></FormLabel>
            <FormControl><Input type="password" placeholder="Confirmar senha" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </>
  );
}

function AdminUserEditForm({ form }: { form: UseFormReturn<AdminUserEditSchema> }) {
  return (
    <>
      <FormField control={form.control} name="v_name" render={({ field }) => (
        <FormItem>
          <FormLabel><RequiredLabel>Nome</RequiredLabel></FormLabel>
          <FormControl>
            <Input
              placeholder="Nome completo"
              maxLength={NAME_MAX_LENGTH}
              {...field}
              value={typeof field.value === 'string' ? limitName(field.value) : ''}
              onChange={(event) => {
                const nextValue = limitName(event.target.value);
                event.target.value = nextValue;
                field.onChange(nextValue);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="v_email" render={({ field }) => (
        <FormItem>
          <FormLabel><RequiredLabel>E-mail</RequiredLabel></FormLabel>
          <FormControl>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              maxLength={EMAIL_MAX_LENGTH}
              {...field}
              value={typeof field.value === 'string' ? limitEmail(field.value) : ''}
              onChange={(event) => {
                const nextValue = limitEmail(event.target.value);
                event.target.value = nextValue;
                field.onChange(nextValue);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="v_phone" render={({ field }) => (
        <FormItem>
          <FormLabel><RequiredLabel>Telefone</RequiredLabel></FormLabel>
          <FormControl>
            <Input
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PHONE_MAX_LENGTH}
              value={field.value ?? ''}
              onChange={(event) => field.onChange(formatPhoneValue(event.target.value))}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}

const PAGE_SIZE = 10;
const COLS = 'grid-cols-[minmax(220px,2fr)_minmax(160px,1fr)_minmax(220px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_80px]';

function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
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

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const { data: adminUsers = [], isLoading, isError, error } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', search, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const params: Record<string, string> = {};

      if (search.trim()) params.search = search.trim();
      if (dateRange?.from) params.data_inicial = format(dateRange.from, 'yyyy-MM-dd');
      if (dateRange?.to) params.data_final = format(dateRange.to, 'yyyy-MM-dd');

      const response = await api.get('/admin-users', { params });
      return (response.data.adminUsers ?? response.data.data ?? []) as AdminUser[];
    },
    throwOnError: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post('/admin-users', payload);
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const response = await api.put(`/admin-users/${id}`, payload);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/admin-users/${id}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (!isError) return;
    const status = (error as any)?.response?.status;
    setAlertInfo({
      message: status === 500 ? 'Erro ao carregar administradores.' : 'Falha inesperada ao conectar com a API.',
      type: 'error',
    });
  }, [isError, error]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDir('asc');
  }

  async function onAdd() {
    await dialog.form('Adicionar Administrador', {
      description: 'Preencha os dados do administrador',
      schema: adminUserFormSchema,
      submitText: 'Salvar',
      defaultValues: {
        v_name: '',
        v_email: '',
        v_phone: '',
        v_password: '',
        confirmPassword: '',
      },
      form: (form) => <AdminUserForm form={form} />,
      async handler({ form, data }) {
        try {
          const payload = {
            v_name: data.v_name,
            v_email: data.v_email,
            v_phone: normalizePhoneDigits(data.v_phone),
            v_password: data.v_password,
          };
          const response = await createMutation.mutateAsync(payload);
          setAlertInfo({ message: response?.success ?? 'Administrador adicionado com sucesso', type: 'success' });
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof AdminUserFormSchema, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao cadastrar administrador.', type: 'error' });
          throw new Error('Falha ao cadastrar');
        }
      },
    });
  }

  async function onEdit(item: AdminUser) {
    await dialog.form('Editar Administrador', {
      description: 'Atualize os dados do administrador',
      schema: adminUserEditSchema,
      submitText: 'Atualizar',
      submitIcon: <Pencil className="ml-2 size-4" />,
      defaultValues: {
        v_name: item.v_name,
        v_email: item.v_email,
        v_phone: formatPhoneValue(item.v_phone ?? ''),
      },
      form: (form) => <AdminUserEditForm form={form} />,
      async handler({ form, data }) {
        try {
          const payload = {
            v_name: data.v_name,
            v_email: data.v_email,
            v_phone: normalizePhoneDigits(data.v_phone),
          };
          const response = await updateMutation.mutateAsync({ id: item.i_id, payload });
          setAlertInfo({ message: response?.success ?? 'Administrador atualizado com sucesso', type: 'success' });
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof AdminUserEditSchema, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao atualizar administrador.', type: 'error' });
          throw new Error('Falha ao atualizar');
        }
      },
    });
  }

  async function onDelete(item: AdminUser) {
    const confirmed = await dialog.confirm('Excluir Administrador', {
      description: `Deseja excluir o administrador ${item.v_name}?`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(item.i_id);
      setAlertInfo({ message: response?.success ?? 'Administrador removido com sucesso', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao excluir administrador.', type: 'error' });
    }
  }

  const sorted = sortKey
    ? [...adminUsers].sort((a, b) => {
        if (sortKey === 'created_at') {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
        }

        if (sortKey === 'status') {
          const aValue = getStatusLabel(a);
          const bValue = getStatusLabel(b);
          return sortDir === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        const aValue = sortKey === 'v_name' ? a.v_name : a.v_email;
        const bValue = sortKey === 'v_name' ? b.v_name : b.v_email;
        return sortDir === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      })
    : adminUsers;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange?.from, dateRange?.to]);

  return (
    <>
      {(createMutation.isPending || updateMutation.isPending || deleteMutation.isPending) && <Loading />}
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      )}

      <Topbar breadcrumbs={[{ label: 'Administradores' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Administradores</h1>
          <p className="text-muted-foreground">Gerenciamento de usuários administradores do sistema</p>
        </div>
        <div>
          <Button variant="primary" onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Administrador
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input placeholder="Pesquisar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            <DateRangePicker date={dateRange} onDateChange={setDateRange} placeholder="Selecione as datas" triggerSize="sm" triggerClassName="w-56 sm:w-60" align="end" />
          </div>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className={`grid ${COLS} gap-4 p-4 font-medium text-muted-foreground text-sm`}>
                <button className="flex items-center gap-1" onClick={() => handleSort('v_name')}>
                  Nome <SortIcon colKey="v_name" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('status')}>
                  Status <SortIcon colKey="status" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('v_email')}>
                  E-mail <SortIcon colKey="v_email" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <div className="text-center">Telefone</div>
                <button className="flex items-center justify-center gap-1" onClick={() => handleSort('created_at')}>
                  Cadastrado em <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <div className="text-center">Ações</div>
              </div>
            </div>

            {isLoading ? (
              <DataTableSkeleton columnCount={6} rowCount={6} />
            ) : sorted.length === 0 ? (
              <DataTableEmptyState
                title="Nenhum administrador cadastrado"
                description="Voce ainda nao possui administradores cadastrados."
                minHeightClassName="min-h-[404px]"
              />
            ) : (
              <div className="divide-y">
                {paginated.map((user) => (
                  <div key={user.i_id} className={`grid ${COLS} gap-4 p-4 text-sm items-center`}>
                    <Link to={`/users/admin-users/${user.i_id}`} className="font-medium hover:text-primary hover:underline">
                      {user.v_name}
                    </Link>
                    <div className="flex justify-center">
                      <span className={`inline-flex min-w-[116px] items-center justify-center rounded-full px-2 py-0.5 text-center text-[11px] font-medium leading-tight ring-1 ${getStatusBadgeClass(user)}`}>
                        {getStatusLabel(user)}
                      </span>
                    </div>
                    <div className="text-center text-muted-foreground">{user.v_email}</div>
                    <div className="text-center text-muted-foreground">{formatPhoneValue(user.v_phone ?? '') || '-'}</div>
                    <div className="text-center text-muted-foreground">{format(new Date(user.created_at), 'dd/MM/yyyy')}</div>
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild className="!text-blue-600 hover:!text-blue-600 focus:!text-blue-600 dark:!text-blue-400 dark:hover:!text-blue-400 dark:focus:!text-blue-400">
                            <Link to={`/users/admin-users/${user.i_id}`}>
                              <Eye className="mr-2 size-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          {!user.isPrimaryAdmin ? (
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                              <Pencil className="mr-2 size-4" />
                              Atualizar
                            </DropdownMenuItem>
                          ) : null}
                          {!user.isPrimaryAdmin ? (
                            <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => onDelete(user)}>
                              <Trash2 className="mr-2 size-4" />
                              Excluir
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isLoading && sorted.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}-{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
                  Anterior
                </Button>
                <span>{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>
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