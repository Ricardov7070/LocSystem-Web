import { z } from 'zod';
import { Plus } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useState } from 'react';
import { toast } from 'sonner';

import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
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

// ─── Form Schema ────────────────────────────────────────────────────────────
const vehicleFormSchema = z.object({
  plate: z.string().min(4, 'Placa deve ter no mínimo 4 caracteres'),
  legalAdvisoryId: z.string().min(1, 'Assessoria jurídica é obrigatória'),
  model: z.string().optional(),
  phone: z.string().optional(),
});
type VehicleFormSchema = z.infer<typeof vehicleFormSchema>;

function VehicleForm({ form }: { form: UseFormReturn<VehicleFormSchema> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="plate"
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
        name="legalAdvisoryId"
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
        name="model"
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
        name="phone"
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

// ─── Table ──────────────────────────────────────────────────────────────────
function VehiclesTable() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Pesquisar por placa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <DateRangePicker
          placeholder="Selecione as datas"
          triggerSize="sm"
          triggerClassName="w-56 sm:w-60"
          align="end"
        />
      </div>

      <div className="overflow-auto rounded-lg border bg-background">
        <div className="sticky top-0 z-10 border-b bg-background">
          <div className="grid grid-cols-[minmax(150px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,2fr)_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
            <div>Placa</div>
            <div>Modelo</div>
            <div>Contato</div>
            <div>Assessoria</div>
            <div>Cadastrado em</div>
            <div>Ações</div>
          </div>
        </div>
        <DataTableEmptyState
          title="Nenhum veículo cadastrado"
          description="Voce ainda nao possui veiculos cadastrados."
          minHeightClassName="min-h-[404px]"
        />
      </div>
    </div>
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
      toast.success(`Veículo ${(vehicle as VehicleFormSchema).plate} adicionado com sucesso`);
    }
  }

  return (
    <Button onClick={onAdd}>
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
