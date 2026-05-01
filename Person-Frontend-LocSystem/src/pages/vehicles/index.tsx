import { z } from 'zod';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';

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
import { DateRangePicker } from '../../components/DateRangePicker';
import CustomAlert from '../../hooks/useCustomAlert';


interface Vehicle {
  i_id: string;
  v_plate: string;
  v_model: string;
  v_phone: string;
  i_legal_advisory_access_id: { name: number };
  created_at: string;
}


const vehicleFormSchema = z.object({
  v_plate: z
    .string()
    .min(1, 'O campo de placa é obrigatório.')
    .regex(
      /^[A-Z]{3}[0-9]{1}[A-Z0-9]{1}[0-9]{2}$|^[A-Z]{3}-[0-9]{4}$/,
      'Placa inválida. Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23).',
    ),
  v_model: z
    .string()
    .min(1, 'O campo de modelo é obrigatório.')
    .max(20, 'O campo de modelo não pode exceder 20 caracteres.'),
  v_phone: z
    .string()
    .min(1, 'O campo de telefone é obrigatório.')
    .refine(
      (val) => /^[0-9]{10,11}$/.test(val.replace(/\D/g, '')),
      'Informe um número válido com DDD (10 ou 11 dígitos).',
    ),
  i_legal_advisory_access_id: z.coerce
    .number({ message: 'O campo de ID da assessoria jurídica deve ser um número inteiro.' })
    .int('O campo de ID da assessoria jurídica deve ser um número inteiro.')
    .positive('O ID da assessoria jurídica deve ser positivo.'),
});


type VehicleFormSchema = z.infer<typeof vehicleFormSchema>;


function formatPlate(value: string): string {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (upper.length <= 3) return upper;
  // Mercosul: ABC1D23 — sem hífen
  if (/^[A-Z]{3}[0-9][A-Z]/.test(upper)) return upper.slice(0, 7);
  // Formato antigo: ABC-1234
  const letters = upper.slice(0, 3);
  const digits = upper.slice(3).replace(/[^0-9]/g, '').slice(0, 4);
  return digits.length > 0 ? `${letters}-${digits}` : letters;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function VehicleForm({ form }: { form: UseFormReturn<VehicleFormSchema> }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="v_plate"
        render={({ field }) => {
          const raw = (field.value ?? '').replace(/[^A-Z0-9]/g, '');
          const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(raw);
          const isOld = /^[A-Z]{3}[0-9]{4}$/.test(raw);
          return (
          <FormItem>
            <FormLabel>Placa</FormLabel>
            <FormControl>
              <Input
                placeholder="Ex: ABC-1234 ou ABC1D23"
                maxLength={8}
                {...field}
                onChange={(e) => field.onChange(formatPlate(e.target.value))}
              />
            </FormControl>
            {isMercosul && (
              <p className="text-[0.75rem] text-blue-400 font-medium">Placa Mercosul detectada</p>
            )}
            {isOld && (
              <p className="text-[0.75rem] text-zinc-400 font-medium">Placa padrão antigo detectada</p>
            )}
            <FormMessage />
          </FormItem>
          );
        }}
      />
      <FormField
        control={form.control}
        name="v_model"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Corolla" {...field} />
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
            <FormLabel>Telefone de Contato</FormLabel>
            <FormControl>
              <Input
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                maxLength={16}
                {...field}
                onChange={(e) => field.onChange(formatPhone(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="i_legal_advisory_access_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assessoria Jurídica</FormLabel>
            {/* TODO: substituir por select/combobox de assessorias */}
            <FormControl>
              <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground select-none cursor-not-allowed">
                Em breve
              </div>
            </FormControl>
            <input type="hidden" {...field} />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}


const COLS = 'grid-cols-[minmax(150px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,2fr)_80px]';
const PAGE_SIZE = 10;

function VehiclesTable() 
{
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);


  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setAlertInfo({ message, type });
  };


  const { data: vehicles, isLoading, isError, error } = useQuery<Vehicle[]>({

    queryKey: ['vehicles', dateRange?.from, dateRange?.to],

    queryFn: async () => {

      const body: Record<string, string> = {};

      if (dateRange?.from && dateRange?.to) {
        body.data_inicial = format(dateRange.from, 'yyyy-MM-dd');
        body.data_final = format(dateRange.to, 'yyyy-MM-dd');
      }

      const response = await api.post('/vehicles', body);

      return response.data.vehicle;

    },

    throwOnError: false,

  });

  useEffect(() => {

    if (!isError) return;

    const status = (error as any)?.response?.status;

    if (status === 500) {
      showAlert('🚫 Erro interno do servidor ao carregar veículos.', 'error');
    } else {
      showAlert('🚫 Ocorreu um erro inesperado ao conectar com a API.', 'error');
    }

  }, [isError, error]);


  const term = search.toLowerCase();
  const filtered = (vehicles ?? []).filter((v) =>
    [
      v.v_plate,
      v.v_model,
      v.v_phone,
      String(v.i_legal_advisory_access_id?.name ?? ''),
      format(new Date(v.created_at), 'dd/MM/yyyy'),
    ].some((col) => col.toLowerCase().includes(term)),
  );


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);


  useEffect(() => { setPage(1); }, [search, dateRange]);

  function handleDelete(vehicle: Vehicle) {
    console.log('Excluir veículo:', vehicle.i_id);
  }

  function handleEdit(vehicle: Vehicle) {
    console.log('Editar veículo:', vehicle.i_id);
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
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Pesquisar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <DateRangePicker
          date={dateRange}
          onDateChange={(range) => {
            setDateRange(range);
          }}
          placeholder="Selecione as datas"
          triggerSize="sm"
          triggerClassName="w-56 sm:w-60"
          align="end"
        />
      </div>

      <div className="overflow-auto rounded-lg border bg-background">
        <div className="sticky top-0 z-10 border-b bg-background">
          <div className={`grid ${COLS} gap-4 p-4 font-medium text-muted-foreground text-sm`}>
            <div>Placa</div>
            <div>Modelo</div>
            <div>Contato</div>
            <div>Assessoria</div>
            <div>Cadastrado em</div>
            <div>Ações</div>
          </div>
        </div>

        {isLoading ? (
          <DataTableSkeleton columnCount={6} rowCount={6} />
        ) : filtered.length === 0 ? (
          <DataTableEmptyState
            title="Nenhum veículo cadastrado"
            description="Você ainda não possui veículos cadastrados."
            minHeightClassName="min-h-[404px]"
          />
        ) : (
          <div className="divide-y">
            {paginated.map((vehicle) => (
              <div
                key={vehicle.i_id}
                className={`grid ${COLS} gap-4 p-4 text-sm items-center`}
              >
                <div className="font-medium">{vehicle.v_plate}</div>
                <div className="text-muted-foreground">{vehicle.v_model ?? '—'}</div>
                <div className="text-muted-foreground">{vehicle.v_phone ?? '—'}</div>
                <div className="text-muted-foreground">
                  {vehicle.i_legal_advisory_access_id?.name ?? '—'}
                </div>
                <div className="text-muted-foreground">
                  {format(new Date(vehicle.created_at), 'dd/MM/yyyy')}
                </div>
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                        <Pencil className="mr-2 size-4" />
                        Atualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(vehicle)}
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

      {!isLoading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} registros
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


function AddVehicle() {

  const queryClient = useQueryClient();
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);


  const registerVehicleMutation = useMutation({

    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.post('/registerVehicle', data);
      return response.data;
    },

  });


  async function onAdd() {

    const result = await dialog.form('Cadastrar Veículo', {
   
      description: 'Preencha os dados do veículo para realizar o cadastro.',
      contentClassname: 'max-w-3xl',
      schema: vehicleFormSchema,
      defaultValues: { v_plate: '', v_model: '', v_phone: '', i_legal_advisory_access_id: '' },
      form: (form) => <VehicleForm form={form} />,

      async handler({ form, data }) {

        try {     

          const raw = data.v_plate.replace(/[^A-Z0-9]/g, '');
          const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(raw);


          const payload = {
            ...data,
            v_phone: data.v_phone.replace(/\D/g, ''),
            v_plate: isMercosul ? '-' : data.v_plate,
            v_plate_mercosul: isMercosul ? data.v_plate : '-',
          };


          const response = await registerVehicleMutation.mutateAsync(payload);
          return response;
        

        } catch (error: any) {

          if (error?.response) {

            const { status, data: errData } = error.response;

            if (status === 422 && errData?.errors) {

              const errors = errData.errors as Record<string, string[]>;
              const fields = ['v_plate', 'v_model', 'v_phone', 'i_legal_advisory_access_id'] as const;

              for (const field of fields) {

                if (errors[field]) {
                  form.setError(field, { message: errors[field][0] });
                }

              }

              throw new Error();

            } else if (status === 401) {

              setAlertInfo({ message: `⚠️ ${errData?.info}`, type: 'warning' });

            } else if (status === 409) {

              setAlertInfo({ message: `⚠️ ${errData?.info}`, type: 'info' });

            } else {

              setAlertInfo({ message: `🚫 ${errData?.error}`, type: 'error' });

            }

          } else {

            setAlertInfo({ message: '🚫 Ocorreu um erro inesperado ao conectar com a API.', type: 'error' });

          }

        }

      },

    });

    if (result && !(result as any).__error) {

      const data = result as any;

      setAlertInfo({ message: `✅ ${data?.success ?? 'Veículo cadastrado com sucesso!'}`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    
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
        Adicionar veículo
        <Plus className="size-4" />
      </Button>
    </>
  );
}


export default function VehiclesPage() {
  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Veículos' }]} />

      <header className="mb-3 flex w-full items-center justify-between gap-4 px-6 py-4 md:px-8 lg:px-10">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Veículos</h1>
          <p className="text-muted-foreground">Gerenciamento de Veículos</p>
        </div>
        <div>
          <AddVehicle />
        </div>
      </header>

      <main className="mb-10 w-full px-6 md:px-8 lg:px-10">
        <VehiclesTable />
      </main>
    </>
  );
}
