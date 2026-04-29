import { toast } from 'sonner';

import { Topbar } from '../../components/layout/app-topbar';
import { Button } from '../../components/ui/button';
import { dialog } from '../../components/dialog';

export default function SessionsPage() {
  async function handleInvalidateAll() {
    const confirmed = await dialog.confirm('Invalidar todas as sessões', {
      description:
        'Essa ação desconectará todos os usuários ativos. Tem certeza que deseja continuar?',
      actionText: 'Invalidar todas',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      // TODO: chamar API
      toast.success('Todas as sessões foram invalidadas');
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Sessões' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Sessões Ativas</h1>
          <p className="text-muted-foreground">Gerenciamento de Sessões de Usuários</p>
        </div>
        <div>
          <Button variant="destructive" onClick={handleInvalidateAll}>
            Invalidar todas as sessões
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="overflow-auto rounded-lg border bg-background">
          <div className="sticky top-0 z-10 border-b bg-background">
            <div className="grid grid-cols-[minmax(180px,2fr)_minmax(200px,2fr)_minmax(120px,1fr)_minmax(150px,1fr)_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
              <div>Usuário</div>
              <div>E-mail</div>
              <div>IP</div>
              <div>Último acesso</div>
              <div>Ações</div>
            </div>
          </div>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Nenhuma sessão ativa encontrada
          </div>
        </div>
      </main>
    </>
  );
}
