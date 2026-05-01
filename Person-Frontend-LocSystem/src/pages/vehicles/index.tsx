import { z } from 'zod';
import { Plus } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  v_plate: z.string().min(4, 'Placa deve ter no mínimo 4 caracteres'),
  i_legal_advisory_access_id: z.string().min(1, 'Assessoria jurídica é obrigatória'),
  v_model: z.string().optional(),
  v_phone: z.string().optional(),
});


type VehicleFormSchema = z.infer<typeof vehicleFormSchema>;

function VehicleForm({ form }: { form: UseFormReturn<VehicleFormSchema> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="v_plate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Placa</FormLabel>
            <FormControl>
              <Input placeholder="Placa" {...field} />
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
            <FormControl>
              <Input placeholder="ID da assessoria jurídica" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="v_model"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo</FormLabel>
            <FormControl>
              <Input placeholder="Modelo (opcional)" {...field} />
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
            <FormLabel>Contato</FormLabel>
            <FormControl>
              <Input type="tel" placeholder="Contato (opcional)" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}


const COLS = 'grid-cols-[minmax(150px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,2fr)_80px]';

function VehiclesTable() 
{
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
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


  const filtered = (vehicles ?? []).filter((v) =>
    v.v_plate.toLowerCase().includes(search.toLowerCase()),
  );

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
          placeholder="Pesquisar por placa..."
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
            {filtered.map((vehicle) => (
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
                <div />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ─── Add Button ─────────────────────────────────────────────────────────────
function AddVehicle() {
  async function onAdd() {
    const vehicle = await dialog.form('Deseja adicionar um veículo?', {
      description: 'Preencha os dados do veículo',
      schema: vehicleFormSchema,
      submitText: 'Adicionar',
      form: (form) => <VehicleForm form={form} />,
      async handler({ data }) {
        // TODO: chamar API
        return data;
      },
    });

    if (vehicle) {
      // TODO: exibir alerta de sucesso via CustomAlert quando integrado com a API
      console.log('Veículo adicionado:', (vehicle as VehicleFormSchema).v_plate);
    }
  }

  return (
    <Button variant="primary" onClick={onAdd}>
      Adicionar veículo
      <Plus className="size-4" />
    </Button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
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
