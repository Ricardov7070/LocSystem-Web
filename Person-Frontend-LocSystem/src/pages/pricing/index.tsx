import { z } from 'zod';
import { Plus, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
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
import Loading from '../../components/ui/Loading';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
} from '../../components/ui/form';
import CustomAlert from '../../hooks/useCustomAlert';


interface PricingPlan {
  i_id: string;
  v_name: string;
  f_operator_price: string;
  f_preposto_price: string;
  b_is_active: boolean;
  created_at: string;
}


const pricingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  operatorPrice: z.string().min(1, 'Valor do localizador é obrigatório'),
  prepostoPrice: z.string().min(1, 'Valor do preposto é obrigatório'),
  isActive: z.enum(['true', 'false'], { message: 'Status é obrigatório' }),
});
type PricingSchema = z.infer<typeof pricingSchema>;


function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const number = parseInt(digits, 10) / 100;
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


function formatCurrencyDisplay(value: string | number | null | undefined): string {
  const num = parseFloat(String(value ?? ''));
  if (isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


function parseCurrencyToDecimal(formatted: string): string {
  const cleaned = formatted.replace(/[^\d,]/g, '');
  return cleaned.replace(',', '.');
}


function PricingForm({ form }: { form: UseFormReturn<PricingSchema> }) {
  return (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="Nome do plano" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="operatorPrice" render={({ field }) => (
          <FormItem>
            <FormLabel>Valor Localizador <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="R$ 0,00"
                value={field.value}
                onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="prepostoPrice" render={({ field }) => (
          <FormItem>
            <FormLabel>Valor Preposto <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="R$ 0,00"
                value={field.value}
                onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="isActive" render={({ field }) => (
        <FormItem>
          <FormLabel>Status <span className="text-red-500">*</span></FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="true">Ativo</SelectItem>
              <SelectItem value="false">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}


const COLS = 'grid-cols-[minmax(180px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(100px,1fr)_minmax(120px,1fr)_80px]';
const PAGE_SIZE = 10;

function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}


function PricingTable() {

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


  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await api.put(`/updatePricingPlan/${id}`, data);
      return response.data;
    },
  });


  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/deletePricingPlan/${id}`);
      return response.data;
    },
  });


  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put(`/activateDeactivatePricingPlans/${id}`);
      return response.data;
    },
  });


  async function handleEdit(plan: PricingPlan) {

    let current = {
      name: plan.v_name,
      operatorPrice: formatCurrencyDisplay(plan.f_operator_price),
      prepostoPrice: formatCurrencyDisplay(plan.f_preposto_price),
      isActive: plan.b_is_active ? 'true' : 'false',
    } as PricingSchema;

    try {
     
      const res = await api.get(`/singlePricingPlan/${plan.i_id}`);
      const record = res.data.pricingPlan ?? res.data.plan ?? res.data;
      current = {
        name: record?.v_name ?? plan.v_name,
        operatorPrice: formatCurrencyDisplay(record?.f_operator_price ?? plan.f_operator_price),
        prepostoPrice: formatCurrencyDisplay(record?.f_preposto_price ?? plan.f_preposto_price),
        isActive: (record?.b_is_active ?? plan.b_is_active) ? 'true' : 'false',
      } as PricingSchema;
   
    } catch {
      // usa dados da tabela como fallback
    }

    await dialog.form('Atualizar Plano', {
      description: 'Atualize os dados do plano de preços',
      schema: pricingSchema,
      submitText: 'Atualizar',
      defaultValues: current,
      form: (form) => <PricingForm form={form} />,

      async handler({ form, data }) {

        try {

          const payload = {
            v_name: data.name,
            f_operator_price: parseFloat(parseCurrencyToDecimal(data.operatorPrice)),
            f_preposto_price: parseFloat(parseCurrencyToDecimal(data.prepostoPrice)),
            b_is_active: data.isActive === 'true',
          };

          const response = await updateMutation.mutateAsync({ id: plan.i_id, data: payload });
          showAlert(`✅ ${response?.success}`, 'success');
          queryClient.invalidateQueries({ queryKey: ['pricingPlans'] });
          return response;

        } catch (error: any) {

          if (error?.response) {

            const { status, data: errData } = error.response;

            if (status === 422 && errData?.errors) {

              const errors = errData.errors as Record<string, string[]>;
              if (errors['v_name']) form.setError('name', { message: errors['v_name'][0] });
              if (errors['f_operator_price']) form.setError('operatorPrice', { message: errors['f_operator_price'][0] });
              if (errors['f_preposto_price']) form.setError('prepostoPrice', { message: errors['f_preposto_price'][0] });
              if (errors['b_is_active']) form.setError('isActive', { message: errors['b_is_active'][0] });
              throw new Error();

            } else if (status === 401) {

              showAlert(`⚠️ ${errData?.info}`, 'warning');             
              throw new Error();

            } else if (status === 409) {

              showAlert(`⚠️ ${errData?.info}`, 'info');
              throw new Error();

            } else {

              showAlert(`🚫 ${errData?.error}`, 'error');
              throw new Error();

            }

          } else {

            showAlert('🚫 Ocorreu um erro inesperado ao conectar com a API.', 'error');
            throw new Error();

          }

        }

      },

    });

  }


  async function handleToggleStatus(plan: PricingPlan) {

    const action = plan.b_is_active ? 'desativar' : 'ativar';
    const confirmed = await dialog.confirm(
      plan.b_is_active ? 'Desativar Plano' : 'Ativar Plano',
      {
        description: `Tem certeza que deseja ${action} o plano "${plan.v_name}"?`,
        actionText: plan.b_is_active ? 'Desativar' : 'Ativar',
        cancelText: 'Cancelar',
      },
    );

    if (!confirmed) return;

    try {
      const response = await toggleStatusMutation.mutateAsync(plan.i_id);
      showAlert(`✅ ${response?.success}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['pricingPlans'] });
    } catch (error: any) {

      if (error?.response) {

        const { status, data: errData } = error.response;

        if (status === 401) {

          showAlert(`⚠️ ${errData?.info}`, 'warning');

        } else if (status === 409) {

          showAlert(`⚠️ ${errData?.info}`, 'info');

        } else if (status === 422) {

          showAlert(`⚠️ ${errData?.message ?? errData?.error}`, 'warning');

        } else {

          showAlert(`🚫 ${errData?.error}`, 'error');
     
        }
     
      } else {

        showAlert('🚫 Ocorreu um erro inesperado ao conectar com a API.', 'error');

      }

    }

  }

  async function handleDelete(plan: PricingPlan) {

    const confirmed = await dialog.confirm('Excluir Plano', {
      description: `Tem certeza que deseja excluir o plano "${plan.v_name}"? Esta ação não pode ser desfeita.`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {

      const response = await deleteMutation.mutateAsync(plan.i_id);
      showAlert(`✅ ${response?.success}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['pricingPlans'] });

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

  const { data: plans, isLoading, isError, error } = useQuery<PricingPlan[]>({  
    queryKey: ['pricingPlans'],
   
    queryFn: async () => {
      const response = await api.get('/pricingPlans');
      return (response.data.pricingPlans ?? response.data.plans ?? response.data.data ?? response.data ?? []) as PricingPlan[];
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
  const filtered = (plans ?? []).filter((p) =>
    [
      p.v_name,
      p.f_operator_price,
      p.f_preposto_price,
      p.b_is_active ? 'Ativo' : 'Inativo',
      format(new Date(p.created_at), 'dd/MM/yyyy'),
    ].some((col) => col?.toLowerCase().includes(term)),
  );


  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        switch (sortKey) {
          case 'v_name': aVal = a.v_name; bVal = b.v_name; break;
          case 'f_operator_price': aVal = parseFloat(a.f_operator_price); bVal = parseFloat(b.f_operator_price); break;
          case 'f_preposto_price': aVal = parseFloat(a.f_preposto_price); bVal = parseFloat(b.f_preposto_price); break;
          case 'b_is_active': aVal = a.b_is_active ? 1 : 0; bVal = b.b_is_active ? 1 : 0; break;
          case 'created_at': aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
          default: return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);


  useEffect(() => { setPage(1); }, [search]);


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
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('f_operator_price')}>
                Valor Localizador <SortIcon colKey="f_operator_price" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('f_preposto_price')}>
                Valor Preposto <SortIcon colKey="f_preposto_price" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('b_is_active')}>
                Status <SortIcon colKey="b_is_active" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('created_at')}>
                Criado em <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <div className="text-center">Ações</div>
            </div>
          </div>

          {isLoading ? (
            <DataTableSkeleton columnCount={6} rowCount={6} />
          ) : filtered.length === 0 ? (
            <DataTableEmptyState
              title="Nenhum plano cadastrado"
              description="Você ainda não possui planos de preços cadastrados."
              minHeightClassName="min-h-[404px]"
            />
          ) : (
            <div className="divide-y">
              {paginated.map((plan) => (
                <div
                  key={plan.i_id}
                  className={`grid ${COLS} gap-4 p-4 text-sm items-center`}
                >
                  <div className="font-medium">{plan.v_name}</div>
                  <div className="text-muted-foreground text-center">{formatCurrencyDisplay(plan.f_operator_price)}</div>
                  <div className="text-muted-foreground text-center">{formatCurrencyDisplay(plan.f_preposto_price)}</div>
                  <div className="flex justify-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${plan.b_is_active ? 'bg-green-100 text-green-700 ring-1 ring-green-600/30' : 'bg-red-100 text-red-700 ring-1 ring-red-600/30'}`}>
                      {plan.b_is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-center">
                    {format(new Date(plan.created_at), 'dd/MM/yyyy')}
                  </div>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {plan.b_is_active && (
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            <Pencil className="mr-2 size-4" />
                            Atualizar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(plan)}
                          className={plan.b_is_active ? 'text-yellow-600 focus:text-yellow-600' : 'text-green-600 focus:text-green-600'}
                        >
                          {plan.b_is_active
                            ? <ToggleLeft className="mr-2 size-4" />
                            : <ToggleRight className="mr-2 size-4" />}
                          {plan.b_is_active ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(plan)}
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


function AddPricingPlan() {

  const queryClient = useQueryClient();
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const registerMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.post('/registerPricingPlan', data);
      return response.data;
    },
  });

  async function onAdd() {

    const result = await dialog.form('Adicionar Plano', {
      description: 'Preencha os dados do plano de preços',
      schema: pricingSchema,
      submitText: 'Salvar',
      defaultValues: { name: '', operatorPrice: '', prepostoPrice: '', isActive: 'true' },
      form: (form) => <PricingForm form={form} />,

      async handler({ form, data }) {

        try {

          const payload = {
            v_name: data.name,
            f_operator_price: parseFloat(parseCurrencyToDecimal(data.operatorPrice)),
            f_preposto_price: parseFloat(parseCurrencyToDecimal(data.prepostoPrice)),
            b_is_active: data.isActive === 'true',
          };

          const response = await registerMutation.mutateAsync(payload);
          queryClient.invalidateQueries({ queryKey: ['pricingPlans'] });
          return response;

        } catch (error: any) {

          if (error?.response) {

            const { status, data: errData } = error.response;

            if (status === 422 && errData?.errors) {

              const errors = errData.errors as Record<string, string[]>;

              if (errors['v_name']) form.setError('name', { message: errors['v_name'][0] });
              if (errors['f_operator_price']) form.setError('operatorPrice', { message: errors['f_operator_price'][0] });
              if (errors['f_preposto_price']) form.setError('prepostoPrice', { message: errors['f_preposto_price'][0] });
              if (errors['b_is_active']) form.setError('isActive', { message: errors['b_is_active'][0] });

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
      
      const resData = result as any;
      setAlertInfo({ message: `✅ ${resData?.success}`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['pricingPlans'] });
    
    }

  }


  return (
    <>
      {registerMutation.isPending && <Loading />}
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
        Adicionar Plano
        <Plus className="size-4" />
      </Button>
    </>
  );
}


export default function PricingPage() {
  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Planos' }]} />

      <header className="mb-3 flex w-full items-center justify-between gap-4 px-6 py-4 md:px-8 lg:px-10">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Planos</h1>
          <p className="text-muted-foreground">Gerenciamento de Planos e Preços</p>
        </div>
        <div>
          <AddPricingPlan />
        </div>
      </header>

      <main className="mb-10 w-full px-6 md:px-8 lg:px-10">
        <PricingTable />
      </main>
    </>
  );
}
