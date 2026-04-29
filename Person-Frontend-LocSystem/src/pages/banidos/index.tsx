import { Input } from '../../components/ui/input';
import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';

export default function BanidosPage() {
  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Usuários Banidos' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Usuários Banidos</h1>
          <p className="text-muted-foreground">Lista de usuários bloqueados do sistema</p>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input placeholder="Pesquisar por nome..." className="w-64" />
          </div>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className="grid grid-cols-[minmax(200px,2fr)_minmax(200px,2fr)_minmax(150px,1fr)_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
                <div>Nome</div>
                <div>E-mail</div>
                <div>Data do Bloqueio</div>
                <div>Ações</div>
              </div>
            </div>
            <DataTableEmptyState
              title="Nenhum usuario banido encontrado"
              description="Voce ainda nao possui usuarios bloqueados cadastrados."
              minHeightClassName="min-h-[404px]"
            />
          </div>
        </div>
      </main>
    </>
  );
}
