import { useState } from 'react';

import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../components/providers/auth';

export default function SearchByCountyPage() {
  const { user } = useAuth();
  const [county, setCounty] = useState('');
  const [searched, setSearched] = useState(false);

  if (user.role !== 'ADMIN' && user.role !== 'AUDITOR') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Apenas administradores e auditores podem buscar operadores por comarca.
          </p>
        </div>
      </div>
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (county.trim()) {
      setSearched(true);
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Busca por Comarca' }]} />

      <header className="container mx-auto mb-3 px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Busca por Comarca</h1>
          <p className="text-muted-foreground">
            Encontre operadores por comarca para apreensões em determinada região
          </p>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        <Card className="p-6">
          <form onSubmit={handleSearch} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Comarca</label>
              <Input
                placeholder="Digite o nome da comarca"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              />
            </div>
            <Button type="submit">Buscar</Button>
          </form>
        </Card>

        {searched && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">
              Resultados para &quot;{county}&quot;
            </h2>
            <div className="overflow-auto rounded-lg border bg-background">
              <div className="sticky top-0 z-10 border-b bg-background">
                <div className="grid grid-cols-[minmax(200px,2fr)_minmax(200px,2fr)_minmax(120px,1fr)_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
                  <div>Operador</div>
                  <div>E-mail</div>
                  <div>Telefone</div>
                  <div>Ações</div>
                </div>
              </div>
              <DataTableEmptyState
                title="Nenhum operador encontrado"
                description="Nao ha operadores vinculados a comarca informada."
                minHeightClassName="min-h-[320px]"
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
