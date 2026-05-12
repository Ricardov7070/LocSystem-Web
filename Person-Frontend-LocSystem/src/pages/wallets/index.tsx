import { z } from 'zod';
import { Plus, MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
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
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
} from '../../components/ui/form';

import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';


interface Wallet {
  i_id: string;
  v_name: string;
  created_at: string;
}


const walletSchema = z.object({
  v_name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(20, 'O nome não pode exceder 20 caracteres.'),
});


type WalletSchema = z.infer<typeof walletSchema>;


function WalletForm({ form }: { form: UseFormReturn<WalletSchema> }) {
  return (
    <FormField control={form.control} name="v_name" render={({ field }) => (
      <FormItem>
        <FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
        <FormControl>
          <Input placeholder="Nome da carteira" maxLength={20} {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}


const COLS = 'grid-cols-[minmax(200px,2fr)_minmax(160px,1fr)_80px]';

const PAGE_SIZE = 10;

function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}


function WalletsTable() {

  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);


  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setAlertInfo({ message, type });
  };

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const queryClient = useQueryClient();


  const registerWalletMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.post('/registerWallet', data);
      return response.data;
    },
  });

  const updateWalletMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await api.put(`/updateWallet/${id}`, data);
      return response.data;
    },
  });

  const deleteWalletMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/deleteWallet/${id}`);
      return response.data;
    },
  });


  async function handleEdit(wallet: Wallet) {

    let currentName = wallet.v_name;

    try {

      const res = await api.get(`/singleWallet/${wallet.i_id}`);
      const record = res.data.wallet ?? res.data.wallets ?? res.data;
      currentName = record?.v_name ?? wallet.v_name;
   
    } catch {

    }

    await dialog.form('Atualizar Carteira', {

      description: 'Atualize o nome da carteira',
      schema: walletSchema,
      submitText: 'Atualizar',
      defaultValues: { v_name: currentName },
      form: (form) => <WalletForm form={form} />,

      async handler({ form, data }) {

        try {

          const response = await updateWalletMutation.mutateAsync({ id: wallet.i_id, data });
          showAlert(`✅ ${response?.success}`, 'success');
          queryClient.invalidateQueries({ queryKey: ['wallets'] });
          return response;

        } catch (error: any) {

          if (error?.response) {

            const { status, data: errData } = error.response;

            if (status === 422 && errData?.errors) {

              const errors = errData.errors as Record<string, string[]>;

              if (errors['v_name']) {
                form.setError('v_name', { message: errors['v_name'][0] });
              }

              throw new Error();

            } else if (status === 401) {

              showAlert(`⚠️ ${errData?.info}`, 'warning');

            } else if (status === 409) {

              showAlert(`⚠️ ${errData?.info}`, 'info');

            } else {

              showAlert(`🚫 ${errData?.error}`, 'error');

            }

          } else {

            showAlert('🚫 Ocorreu um erro inesperado ao conectar com a API.', 'error');
        
          }

        }

      },

    });

  }


  async function handleDelete(wallet: Wallet) {

    const confirmed = await dialog.confirm('Excluir Carteira', {
      description: `Tem certeza que deseja excluir a carteira "${wallet.v_name}"? Esta ação não pode ser desfeita.`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {

      const response = await deleteWalletMutation.mutateAsync(wallet.i_id);
      showAlert(`✅ ${response?.success}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });

    } catch (error: any) {

      if (error?.response) {

        const { status, data: errData } = error.response;

        if (status === 401) {

          showAlert(`⚠️ ${errData?.info}`, 'warning');
   
        } else {

          showAlert(`🚫 ${errData?.error}`, 'error');
       
        }

      } else {

        showAlert('🚫 Ocorreu um erro inesperado ao conectar com a API.', 'error');
   
      }

    }

  }


  const { data: wallets, isLoading, isError, error } = useQuery<Wallet[]>({
   
    queryKey: ['wallets'],

    queryFn: async () => {
      const response = await api.get('/wallets');
      return (response.data.wallets ?? response.data.wallet ?? response.data.data ?? response.data ?? []) as Wallet[];
    },

    throwOnError: false,

  });


  useEffect(() => {

    if (!isError) return;

    const status = (error as any)?.response?.status;

    if (status === 500) {

      showAlert(`🚫 ${(error as any)?.response?.data?.error}`, 'error');
  
    } else {
    
      showAlert('🚫 Ocorreu um erro inesperado ao conectar com a API.', 'error');
    
    }

  }, [isError, error]);


  const term = search.toLowerCase();

  const filtered = (wallets ?? []).filter((w) =>
    [
      w.v_name,
      format(new Date(w.created_at), 'dd/MM/yyyy'),
    ].some((col) => col.toLowerCase().includes(term)),
  );


  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        switch (sortKey) {
          case 'v_name': aVal = a.v_name; bVal = b.v_name; break;
          case 'created_at': aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
          default: return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortDir === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <>
      {(registerWalletMutation?.isPending || updateWalletMutation?.isPending || deleteWalletMutation?.isPending) && <Loading />}
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      )}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="overflow-auto rounded-lg border bg-background">
          <div className="sticky top-0 z-10 border-b bg-background">
            <div className={`grid ${COLS} gap-4 p-4 font-medium text-muted-foreground text-sm`}>
              <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_name')}>
                Nome <SortIcon colKey="v_name" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('created_at')}>
                Criado em <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <div className="text-center">Ações</div>
            </div>
          </div>

          {isLoading ? (
            <DataTableSkeleton columnCount={3} rowCount={6} />
          ) : filtered.length === 0 ? (
            <DataTableEmptyState
              title="Nenhuma carteira cadastrada"
              description="Você ainda não possui carteiras cadastradas."
              minHeightClassName="min-h-[404px]"
            />
          ) : (
            <div className="divide-y">
              {paginated.map((wallet) => (
                <div
                  key={wallet.i_id}
                  className={`grid ${COLS} gap-4 p-4 text-sm items-center`}
                >
                  <div className="font-medium">{wallet.v_name}</div>
                  <div className="text-muted-foreground text-center">
                    {format(new Date(wallet.created_at), 'dd/MM/yyyy')}
                  </div>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(wallet)}>
                          <Pencil className="mr-2 size-4" />
                          Atualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(wallet)}
                          className="text-red-500 focus:text-red-500"
                        >
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
              Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} registros
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="px-1">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


function AddWallet() {

  const queryClient = useQueryClient();
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const registerWalletMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.post('/registerWallet', data);
      return response.data;
    },
  });

  async function onAdd() {

    const result = await dialog.form('Adicionar Carteira', {
      description: 'Informe o nome da carteira',
      schema: walletSchema,
      submitText: 'Salvar',
      defaultValues: { v_name: '' },
      form: (form) => <WalletForm form={form} />,

      async handler({ form, data }) {

        try {

          const response = await registerWalletMutation.mutateAsync(data);
     
          return response;

        } catch (error: any) {

          if (error?.response) {

            const { status, data: errData } = error.response;

            if (status === 422 && errData?.errors) {

              const errors = errData.errors as Record<string, string[]>;

              if (errors['v_name']) {
                form.setError('v_name', { message: errors['v_name'][0] });
              }

              throw new Error();

            } else if (status === 401) {

              setAlertInfo({ message: `⚠️ ${errData?.info}`, type: 'warning' });
              throw new Error();

            } else if (status === 409) {

              setAlertInfo({ message: `⚠️ ${errData?.info}`, type: 'info' });
              throw new Error();

            } else {

              setAlertInfo({ message: `🚫 ${errData?.error}`, type: 'error' });
              throw new Error();

            }

          } else {

            setAlertInfo({ message: '🚫 Ocorreu um erro inesperado ao conectar com a API.', type: 'error' });
            throw new Error();

          }

        }

      },  
    });

    if (result && !(result as any).__error) {

      const data = result as any;

      setAlertInfo({ message: `✅ ${data?.success ?? 'Carteira adicionada com sucesso!'}`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });

    }

  }

  return (
    <>
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      )}
      <Button variant="primary" onClick={onAdd}>
        Adicionar Carteira
        <Plus className="size-4" />
      </Button>
    </>
  );
}


export default function WalletsPage() {
  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Carteiras' }]} />

      <header className="mb-3 flex w-full items-center justify-between gap-4 px-6 py-4 md:px-8 lg:px-10">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Carteiras</h1>
          <p className="text-muted-foreground">Gerenciamento de Carteiras</p>
        </div>
        <div>
          <AddWallet />
        </div>
      </header>

      <main className="mb-10 w-full px-6 md:px-8 lg:px-10">
        <WalletsTable />
      </main>
    </>
  );
}
