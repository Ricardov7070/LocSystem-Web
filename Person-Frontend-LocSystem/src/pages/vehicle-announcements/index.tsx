import { useState } from 'react';

import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { DateRangePicker } from '../../components/DateRangePicker';

const announcementLabels: Record<string, string> = {
  JA_LOCALIZADO: 'Já Localizado',
  CONTRATO_QUITADO: 'Contrato Quitado',
  CONTRATO_SUBSTABELECIDO: 'Contrato Substabelecido',
  VEICULO_NAO_APTO: 'Veículo Não Apto',
  VEICULO_APREENDIDO: 'Veículo Apreendido',
  BA_ANDAMENTO_POR_MIM: 'B.A em andamento',
  BA_ANDAMENTO_POR_TERCEIRO: 'B.A por Terceiro',
};

export default function VehicleAnnouncementsPage() {
  const [type, setType] = useState('all');

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Veículos com Comunicados' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Veículos com Comunicados</h1>
          <p className="text-muted-foreground">Lista de veículos com comunicados ativos</p>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input placeholder="Pesquisar por placa..." className="w-64" />

              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-auto min-w-[16rem]">
                  <SelectValue placeholder="Tipo de comunicado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os comunicados</SelectItem>
                  {Object.entries(announcementLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DateRangePicker placeholder="Selecione as datas" triggerSize="sm" triggerClassName="w-56 sm:w-60" align="end" />
          </div>

          <div className="overflow-auto rounded-lg border bg-background" style={{ height: '600px' }}>
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className="grid grid-cols-[minmax(120px,1fr)_minmax(180px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)] gap-4 p-4 font-medium text-muted-foreground text-sm">
                <div>Placa</div>
                <div>Tipo de Comunicado</div>
                <div>Data</div>
                <div>Operador</div>
                <div>Assessoria</div>
              </div>
            </div>
            <DataTableEmptyState
              title="Nenhum veículo com comunicados encontrado"
              description="Voce ainda nao possui veiculos com comunicados cadastrados."
              minHeightClassName="min-h-[404px]"
            />
          </div>
        </div>
      </main>
    </>
  );
}
