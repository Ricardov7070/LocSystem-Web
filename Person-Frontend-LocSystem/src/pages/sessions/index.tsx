import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { LogOut, ArrowUp, ArrowDown, ArrowUpDown, Smartphone, Monitor } from 'lucide-react';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';


interface Session {
  i_id: string;
  v_name: string;
  v_email: string;
  e_role: string | null;
  v_device_name: string | null;
  d_device_last_seen: string | null;
  v_device_country: string | null;
  created_at: string | null;
  d_expires_at: string | null;
}


function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}


const COLS = 'grid-cols-[minmax(200px,2fr)_minmax(160px,1.5fr)_minmax(140px,1.5fr)_minmax(150px,1.5fr)_minmax(150px,1.5fr)_80px]';

const PAGE_SIZE = 10;


function SessionsTable({ onCount, onIds }: { onCount?: (n: number) => void; onIds?: (ids: string[]) => void }) {

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

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

  const queryClient = useQueryClient();

  const singleSessionMutation = useMutation({   
    mutationFn: async (id: string) => {
      const response = await api.post(`/singleSession/${id}`, {
        ids: [id],
      });
      return response.data;
    },
  });

  async function handleLogout(session: Session) {
    const confirmed = await dialog.confirm('Encerrar Sessão', {
      description: `Tem certeza que deseja encerrar a sessão de "${session.v_name}"? O usuário será desconectado imediatamente.`,
      actionText: 'Encerrar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {

      const response = await singleSessionMutation.mutateAsync(session.i_id);
      showAlert(`✅ ${response?.success}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });

    } catch (error: any) {

      if (error?.response) {

        const { status, data: errData } = error.response;

        if (status === 401) {

          showAlert(`⚠️ ${errData?.info ?? errData?.error}`, 'warning');

        } else {

          showAlert(`🚫 ${errData?.error}`, 'error');

        }

      } else {

        showAlert('🚫 Ocorreu um erro inesperado ao conectar com a API.', 'error');

      }

    }

  }


  const { data: sessions, isLoading, isError, error } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await api.get('/sessions');
      return (response.data.sessions ?? response.data.data ?? response.data ?? []) as Session[];
    },
    staleTime: 0,
    refetchOnMount: true,
    throwOnError: false,
  });


  useEffect(() => {
    if (!isError) return;
    const status = (error as any)?.response?.status;
    if (status === 500) {
      showAlert(`🚫 ${(error as any)?.response?.data?.error}`, 'error');
    } else {
      showAlert('🚫 Ocorreu um erro inesperado ao conectar com a API.', 'error');
    }
  }, [isError, error]);

  
  useEffect(() => {
    const list = sessions ?? [];
    onCount?.(list.length);
    onIds?.(list.map((s) => s.i_id));
  }, [sessions, onCount, onIds]);


  const term = search.toLowerCase();


  const filtered = (sessions ?? []).filter((s) =>
    [
      s.v_name,
      s.v_email,
      s.e_role ?? '',
      s.v_device_name ?? '',
      s.v_device_country ?? '',
      s.created_at ? format(new Date(s.created_at), 'dd/MM/yyyy') : '',
      s.d_expires_at ? format(new Date(s.d_expires_at), 'dd/MM/yyyy') : '',
    ].some((col) => col.toLowerCase().includes(term)),
  );


  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        switch (sortKey) {
          case 'v_name': aVal = a.v_name; bVal = b.v_name; break;
          case 'v_device_name': aVal = a.v_device_name ?? ''; bVal = b.v_device_name ?? ''; break;
          case 'v_device_country': aVal = a.v_device_country ?? ''; bVal = b.v_device_country ?? ''; break;
          case 'created_at': aVal = a.created_at ? new Date(a.created_at).getTime() : 0; bVal = b.created_at ? new Date(b.created_at).getTime() : 0; break;
          case 'd_expires_at': aVal = a.d_expires_at ? new Date(a.d_expires_at).getTime() : 0; bVal = b.d_expires_at ? new Date(b.d_expires_at).getTime() : 0; break;
          default: return 0;
        }
        if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
        return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string);
      })
    : filtered;


  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);


  useEffect(() => { setPage(1); }, [search]);


  return (
    <>
      {singleSessionMutation?.isPending && <Loading />}
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
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="overflow-auto rounded-lg border bg-background">
          <div className="sticky top-0 z-10 border-b bg-background">
            <div className={`grid ${COLS} gap-4 p-4 font-medium text-muted-foreground text-sm`}>
              <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_name')}>
                Usuário <SortIcon colKey="v_name" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_device_name')}>
                Dispositivo <SortIcon colKey="v_device_name" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_device_country')}>
                Localização <SortIcon colKey="v_device_country" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('created_at')}>
                Sessão Criada Em: <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('d_expires_at')}>
                Expira Em: <SortIcon colKey="d_expires_at" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <div className="text-center">Ação</div>
            </div>
          </div>

          {isLoading ? (
            <DataTableSkeleton columnCount={6} rowCount={6} />
          ) : filtered.length === 0 ? (
            <DataTableEmptyState
              title="Nenhuma sessão ativa encontrada"
              description="Não há sessões ativas no sistema."
              minHeightClassName="min-h-[404px]"
            />
          ) : (
            <div className="divide-y">
              {paginated.map((session) => (
                <div
                  key={session.i_id}
                  className={`grid ${COLS} gap-4 p-4 text-sm items-center`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{session.v_name}</div>
                    <div className="text-muted-foreground text-xs truncate">{session.v_email}</div>
                    {session.e_role && (
                      <span className="inline-block mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground ring-1 ring-border">
                        {session.e_role}
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground truncate">
                      {/android|iphone/i.test(session.v_device_name ?? '')
                        ? <Smartphone className="size-4 shrink-0" />
                        : <Monitor className="size-4 shrink-0" />}
                      {session.v_device_name ?? '—'}
                    </div>
                    {session.d_device_last_seen && (
                      <div className="text-muted-foreground text-xs mt-0.5">
                        Última atividade: {format(new Date(session.d_device_last_seen), 'dd/MM/yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground text-center">
                    {session.v_device_country ?? '—'}
                  </div>
                  <div className="text-muted-foreground text-center">
                    {session.created_at
                      ? format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')
                      : '—'}
                  </div>
                  <div className="flex justify-center">
                    {session.d_expires_at
                      ? <span className="text-muted-foreground">{format(new Date(session.d_expires_at), 'dd/MM/yyyy HH:mm')}</span>
                      : <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground ring-1 ring-border">Permanente</span>}
                  </div>
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 gap-1.5"
                      onClick={() => handleLogout(session)}
                      disabled={singleSessionMutation.isPending}
                    >
                      <LogOut className="size-4" />
                      Sair
                    </Button>
                  </div>
                </div>
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
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


export default function SessionsPage() {

  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  async function handleInvalidateAll() {
    const confirmed = await dialog.confirm('Invalidar todas as sessões', {
      description: 'Essa ação desconectará todos os usuários ativos. Tem certeza que deseja continuar?',
      actionText: 'Invalidar todas',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    if (!sessionIds.length) return;

    try {

      await Promise.all(
        sessionIds.map((id) =>
          api.post(`/singleSession/${id}`, {
            ids: [id],
          }),
        ),
      );
      queryClient.invalidateQueries({ queryKey: ['sessions'] });

    } catch {
      
    }

  }


  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Sessões' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Sessões Ativas</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Gerenciamento de Sessões de Usuários
            {sessionCount !== null && (
              <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-600 ring-1 ring-blue-400/40">
                {sessionCount} {sessionCount === 1 ? 'Sessão' : 'Sessões'}
              </span>
            )}
          </p>
        </div>
        <div>
          <Button variant="primary" onClick={handleInvalidateAll} className="gap-2">
            <LogOut className="size-4" />
            Invalidar todas as sessões
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <SessionsTable onCount={setSessionCount} onIds={setSessionIds} />
      </main>
    </>
  );
}
