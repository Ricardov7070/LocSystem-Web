import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';

export default function LogsPage() {
  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Logs' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Logs</h1>
          <p className="text-muted-foreground">Histórico de logs do sistema</p>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <DataTableEmptyState />
      </main>
    </>
  );
}
