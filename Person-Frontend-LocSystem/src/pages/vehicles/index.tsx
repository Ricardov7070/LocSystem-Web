const updateVehicleMutation = { isPending: false };
const deleteVehicleMutation = { isPending: false };
import { z } from 'zod';
import { Plus, MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
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
import { LegalAdvisoryCombobox } from '../../components/ui/legal-advisory-combobox';
import { formatDate, formatPhone as formatSystemPhone, stripNonDigits } from '../../lib/utils';

import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';


interface Vehicle {
  i_id: string;
  v_plate: string;
  v_plate_mercosul?: string;
  v_model: string;
  v_phone: string;
  i_legal_advisory_access_id?: number | string | {
    i_id?: number | string;
    id?: number | string;
    name?: string | number;
    v_name?: string;
  } | null;
  legalAdvisoryAccess?: {
    i_id?: number | string;
    id?: number | string;
    i_legal_advisory_id?: number | string;
    legalAdvisory?: {
      i_id?: number | string;
      id?: number | string;
      v_name?: string;
      name?: string;
    } | null;
  } | null;
  legal_advisory_access?: {
    i_id?: number | string;
    id?: number | string;
    i_legal_advisory_id?: number | string;
    legal_advisory?: {
      i_id?: number | string;
      id?: number | string;
      v_name?: string;
      name?: string;
    } | null;
  } | null;
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
  if (/^[A-Z]{3}[0-9][A-Z]/.test(upper)) return upper.slice(0, 7);

  const letters = upper.slice(0, 3);
  const digits = upper.slice(3).replace(/[^0-9]/g, '').slice(0, 4);
  return digits.length > 0 ? `${letters}-${digits}` : letters;
}

function isMercosulPlate(value: string | null | undefined) {
  const raw = (value ?? '').replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(raw);
}

function getVehicleDisplayPlate(vehicle: Pick<Vehicle, 'v_plate' | 'v_plate_mercosul'>) {
  return [vehicle.v_plate, vehicle.v_plate_mercosul].find((plate) => plate && plate !== '-') ?? '';
}

function getVehicleLegalAdvisory(vehicle: Vehicle) {
  return vehicle.legalAdvisoryAccess?.legalAdvisory
    ?? vehicle.legal_advisory_access?.legal_advisory
    ?? (typeof vehicle.i_legal_advisory_access_id === 'object' ? vehicle.i_legal_advisory_access_id : null);
}

function getLegalAdvisoryOptionId(vehicle: Vehicle) {
  const advisory = getVehicleLegalAdvisory(vehicle);

  if (advisory && typeof advisory === 'object') {
    return advisory.i_id ?? advisory.id ?? '';
  }

  return '';
}

function getLegalAdvisoryName(vehicle: Vehicle) {
  const advisory = getVehicleLegalAdvisory(vehicle);

  if (advisory && typeof advisory === 'object') {
    return String(advisory.v_name ?? advisory.name ?? '—');
  }

  return '—';
}

function getVehiclePlateValues(vehicle: Vehicle) {
  return [vehicle.v_plate, vehicle.v_plate_mercosul]
    .filter((plate): plate is string => Boolean(plate && plate !== '-'))
    .filter((plate, index, plates) => plates.indexOf(plate) === index);
}

function getVehiclePlateTypeMeta(vehicle: Pick<Vehicle, 'v_plate' | 'v_plate_mercosul'>) {
  const displayPlate = getVehicleDisplayPlate(vehicle);

  if (!displayPlate) {
    return null;
  }

  if (isMercosulPlate(displayPlate)) {
    return {
      label: 'Mercosul',
      className: 'text-xs font-medium text-blue-400',
    };
  }

  return {
    label: 'Padrão',
    className: 'text-xs font-medium text-zinc-300',
  };
}

function formatVehicleCreatedAt(value: string | null | undefined) {
  if (!value) return '—';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return formatDate(parsedDate);
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
            <FormLabel>Placa <span className="text-red-500">*</span></FormLabel>
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
            <FormLabel>Modelo <span className="text-red-500">*</span></FormLabel>
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
            <FormLabel>Telefone de Contato <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                maxLength={16}
                {...field}
                onChange={(e) => field.onChange(formatSystemPhone(e.target.value))}
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
            <FormLabel>Assessoria Jurídica <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <LegalAdvisoryCombobox
                value={field.value ? String(field.value) : undefined}
                onValueChange={(value) => field.onChange(Number(value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}


const COLS = 'grid-cols-[minmax(150px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,2fr)_80px]';
const PAGE_SIZE = 10;


function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}


function VehiclesTable() {

  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const queryClient = useQueryClient();


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
      getVehiclePlateValues(v).join(' '),
      v.v_model,
      formatSystemPhone(v.v_phone ?? ''),
      getLegalAdvisoryName(v),
      formatVehicleCreatedAt(v.created_at),
    ].some((col) => col.toLowerCase().includes(term)),
  );


  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        switch (sortKey) {
          case 'v_plate': aVal = getVehiclePlateValues(a).join(' '); bVal = getVehiclePlateValues(b).join(' '); break;
          case 'v_model': aVal = a.v_model ?? ''; bVal = b.v_model ?? ''; break;
          case 'v_phone': aVal = formatSystemPhone(a.v_phone ?? ''); bVal = formatSystemPhone(b.v_phone ?? ''); break;
          case 'advisory': aVal = getLegalAdvisoryName(a); bVal = getLegalAdvisoryName(b); break;
          case 'created_at': aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
          default: return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, dateRange]);


  const deleteVehicleMutation = useMutation({

    mutationFn: async (vehicleId: string) => {
      const response = await api.post(`/deleteVehicle/${vehicleId}`, {}, {
        headers: { 'vehicle-id': vehicleId },
      });
      return response.data;
    },

    onSuccess: (data) => {
      showAlert(data?.success, 'success');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },

    onError: (error: any) => {

      if (error?.response?.data?.error) {

        showAlert(`🚫 ${error.response.data.error}`, 'error');

      } else {

        showAlert('🚫 Erro ao excluir veículo.', 'error');

      }

    },

  });


  function handleDelete(vehicle: Vehicle) {
    if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
      deleteVehicleMutation.mutate(vehicle.i_id);
    }
  }


  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await api.post(`/updateVehicle/${id}`, data, {
        headers: { 'vehicle-id': id },
      });
      return response.data;
    },
  });


  async function handleEdit(vehicle: Vehicle) {
    let current = {
      v_plate: getVehicleDisplayPlate(vehicle),
      v_model: vehicle.v_model,
      v_phone: formatSystemPhone(vehicle.v_phone),
      i_legal_advisory_access_id: getLegalAdvisoryOptionId(vehicle),
    } as VehicleFormSchema;

    try {

      const res = await api.get(`/singleVehicle/${vehicle.i_id}`, {
        headers: { 'vehicle-id': vehicle.i_id },
      });

      const record = res.data.vehicle ?? res.data;
      current = {
        v_plate: getVehicleDisplayPlate(record ?? vehicle),
        v_model: record?.v_model ?? vehicle.v_model,
        v_phone: formatSystemPhone(record?.v_phone ?? vehicle.v_phone),
        i_legal_advisory_access_id: getLegalAdvisoryOptionId(record ?? vehicle) || getLegalAdvisoryOptionId(vehicle),
      } as VehicleFormSchema;
    } catch {

    }

    await dialog.form('Atualizar Veículo', {

      description: 'Atualize os dados do veículo',
      schema: vehicleFormSchema,
      submitText: 'Atualizar',
      defaultValues: current,

      form: (form) => <VehicleForm form={form} />, 

      async handler({ form, data }) {
        
        try {

          const isMercosul = isMercosulPlate(data.v_plate);
          const payload = {
            ...data,
            v_phone: stripNonDigits(data.v_phone),
            v_plate: isMercosul ? '-' : data.v_plate,
            v_plate_mercosul: isMercosul ? data.v_plate : '-',
          };

          const response = await updateVehicleMutation.mutateAsync({ id: vehicle.i_id, data: payload });
          showAlert(`✅ ${response?.success}`, 'success');
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        
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


  return (
    <>
      {updateVehicleMutation.isPending && <Loading />}
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
            <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_plate')}>
              Placas <SortIcon colKey="v_plate" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_model')}>
              Modelo <SortIcon colKey="v_model" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_phone')}>
              Contato <SortIcon colKey="v_phone" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('advisory')}>
              Assessoria <SortIcon colKey="advisory" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('created_at')}>
              Cadastrado em <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <div className="text-center">Ações</div>
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
              (() => {
                const plateValues = getVehiclePlateValues(vehicle);
                const plateTypeMeta = getVehiclePlateTypeMeta(vehicle);

                return (
              <div
                key={vehicle.i_id}
                className={`grid ${COLS} gap-4 p-4 text-sm items-center`}
              >
                <div className="min-w-0">
                  <div className="font-medium">{plateValues[0] ?? '—'}</div>
                  {plateTypeMeta && <div className={plateTypeMeta.className}>{plateTypeMeta.label}</div>}
                </div>
                <div className="text-muted-foreground text-center">{vehicle.v_model ?? '—'}</div>
                <div className="text-muted-foreground text-center">{vehicle.v_phone ? formatSystemPhone(vehicle.v_phone) : '—'}</div>
                <div className="text-muted-foreground text-center">
                  {getLegalAdvisoryName(vehicle)}
                </div>
                <div className="text-muted-foreground text-center">
                  {formatVehicleCreatedAt(vehicle.created_at)}
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
                );
              })()
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

          const isMercosul = isMercosulPlate(data.v_plate);


          const payload = {
            ...data,
            v_phone: stripNonDigits(data.v_phone),
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
      {(registerVehicleMutation?.isPending || updateVehicleMutation?.isPending || deleteVehicleMutation?.isPending) && <Loading />}
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
