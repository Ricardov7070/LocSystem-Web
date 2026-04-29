import { useState } from 'react';

import { Topbar } from '../../components/layout/app-topbar';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { DateRangePicker } from '../../components/DateRangePicker';

export default function IncidencesRetroactivePage() {
  const [captureMethod, setCaptureMethod] = useState('all');
  const [unread, setUnread] = useState('all');

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Incidências' }, { label: 'Retroativas' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Incidências Retroativas</h1>
          <p className="text-muted-foreground">
            Incidências capturadas antes do cadastro do veículo
          </p>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input placeholder="Pesquisar por placa..." className="w-64" />

              <Select value={captureMethod} onValueChange={setCaptureMethod}>
                <SelectTrigger className="w-auto min-w-[14rem]">
                  <SelectValue placeholder="Método de captura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os métodos</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="CAMERA">Câmera</SelectItem>
                  <SelectItem value="EXTERNAL_CAMERA">Câmera Externa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={unread} onValueChange={setUnread}>
                <SelectTrigger className="w-auto min-w-[12rem]">
                  <SelectValue placeholder="Lidas / Não lidas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="true">Apenas não lidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DateRangePicker placeholder="Selecione as datas" triggerSize="sm" triggerClassName="w-56 sm:w-60" align="end" />
          </div>

          <div className="overflow-auto rounded-lg border bg-background" style={{ height: '600px' }}>
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className="grid grid-cols-[minmax(120px,1fr)_minmax(150px,2fr)_minmax(150px,2fr)_minmax(120px,1fr)_minmax(140px,1.5fr)_minmax(100px,1fr)_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
                <div>Placa</div>
                <div>Localizador</div>
                <div>Assessoria</div>
                <div>Método</div>
                <div>Data da Captura</div>
                <div>Imagem</div>
                <div>Ações</div>
              </div>
            </div>
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Nenhuma incidência retroativa encontrada
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
