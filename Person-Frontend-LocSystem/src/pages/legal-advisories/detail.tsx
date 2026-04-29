import { useParams } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';

import { Topbar } from '../../components/layout/app-topbar';
import { Card } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { DateRangePicker } from '../../components/DateRangePicker';

export default function LegalAdvisoryDetailPage() {
  useParams<{ id: string }>();

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: 'Assessorias Jurídicas', href: '/legal-advisories' },
          { label: 'Detalhes' },
        ]}
      />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Assessoria Jurídica</h1>
          <p className="text-muted-foreground">Detalhes da assessoria jurídica</p>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        {/* Info Card */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Informações da Assessoria</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {[
                { label: 'Nome', value: '—' },
                { label: 'Documento', value: '—' },
                { label: 'Telefone', value: '—' },
                { label: 'Carteira', value: '—' },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">{row.label}</span>
                    <span className="text-sm">{row.value}</span>
                  </div>
                  {i < arr.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Import History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Histórico de Importações</h2>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div />
            <DateRangePicker placeholder="Filtrar por data" triggerSize="sm" triggerClassName="w-56 sm:w-60" align="end" />
          </div>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className="grid grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(80px,80px)] gap-4 p-4 font-medium text-muted-foreground text-sm">
                <div>Arquivo</div>
                <div>Registros</div>
                <div>Data</div>
                <div>Status</div>
              </div>
            </div>
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              Nenhuma importação encontrada
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
