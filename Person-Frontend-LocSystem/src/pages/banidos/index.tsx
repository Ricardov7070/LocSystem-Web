import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { LockOpen, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import CustomAlert from '../../hooks/useCustomAlert';


interface BannedUser {
  i_id: string;
  v_name: string;
  v_email: string;
  v_phone: string | null;
  d_ban_when: string | null;
  t_ban_reason: string | null;
  e_role: string | null;
  d_ban_expires: string | null;
}

function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

function formatPhone(value: string | null): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}


const COLS = 'grid-cols-[minmax(200px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,1.5fr)_minmax(130px,1fr)_minmax(130px,1fr)_90px]';

const PAGE_SIZE = 10;


function BannedTable({ onCount }: { onCount?: (n: number) => void }) {

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }


  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setAlertInfo({ message, type });
  };


  const queryClient = useQueryClient();


  const unbanMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.get(`/singleBanned/${id}`);
      return response.data;
    },
  });

  async function handleUnban(user: BannedUser) {

    const confirmed = await dialog.confirm('Desbanir Usuário', {
      description: `Tem certeza que deseja desbanir o usuário "${user.v_name}"? Ele voltará a ter acesso ao sistema.`,
      actionText: 'Desbanir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {

      const response = await unbanMutation.mutateAsync(user.i_id);
      showAlert(`✅ ${response?.success}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['banneds'] });

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


  const { data: banneds, isLoading, isError, error } = useQuery<BannedUser[]>({
    queryKey: ['banneds'],
    queryFn: async () => {
      const response = await api.get('/banneds');
      return (response.data.banneds ?? response.data.data ?? response.data ?? []) as BannedUser[];
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
    onCount?.((banneds ?? []).length);
  }, [banneds, onCount]);


  const term = search.toLowerCase();


  const filtered = (banneds ?? []).filter((u) =>
    [
      u.v_name,
      u.v_email,
      u.v_phone ?? '',
      u.t_ban_reason ?? '',
      u.e_role ?? '',
      u.d_ban_when ? format(new Date(u.d_ban_when), 'dd/MM/yyyy') : '',
      u.d_ban_expires ? format(new Date(u.d_ban_expires), 'dd/MM/yyyy') : '',
    ].some((col) => col.toLowerCase().includes(term)),
  );

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        switch (sortKey) {
          case 'v_name': aVal = a.v_name; bVal = b.v_name; break;
          case 'v_phone': aVal = a.v_phone ?? ''; bVal = b.v_phone ?? ''; break;
          case 'e_role': aVal = a.e_role ?? ''; bVal = b.e_role ?? ''; break;
          case 't_ban_reason': aVal = a.t_ban_reason ?? ''; bVal = b.t_ban_reason ?? ''; break;
          case 'd_ban_when': aVal = a.d_ban_when ? new Date(a.d_ban_when).getTime() : 0; bVal = b.d_ban_when ? new Date(b.d_ban_when).getTime() : 0; break;
          case 'd_ban_expires': aVal = a.d_ban_expires ? new Date(a.d_ban_expires).getTime() : 0; bVal = b.d_ban_expires ? new Date(b.d_ban_expires).getTime() : 0; break;
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
      {unbanMutation?.isPending && <Loading />}
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
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_phone')}>
                Telefone <SortIcon colKey="v_phone" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('e_role')}>
                Função <SortIcon colKey="e_role" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('t_ban_reason')}>
                Motivo <SortIcon colKey="t_ban_reason" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('d_ban_when')}>
                Banido Em: <SortIcon colKey="d_ban_when" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('d_ban_expires')}>
                Expira Em: <SortIcon colKey="d_ban_expires" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <div className="text-center">Ação</div>
            </div>
          </div>

          {isLoading ? (
            <DataTableSkeleton columnCount={4} rowCount={6} />
          ) : filtered.length === 0 ? (
            <DataTableEmptyState
              title="Nenhum usuário banido encontrado"
              description="Não há usuários bloqueados no sistema."
              minHeightClassName="min-h-[404px]"
            />
          ) : (
            <div className="divide-y">
              {paginated.map((user) => (
                <div
                  key={user.i_id}
                  className={`grid ${COLS} gap-4 p-4 text-sm items-center`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{user.v_name}</div>
                    <div className="text-muted-foreground text-xs truncate">{user.v_email}</div>
                  </div>
                  <div className="text-muted-foreground text-center">
                    {formatPhone(user.v_phone)}
                  </div>
                  <div className="flex justify-center">
                    {user.e_role
                      ? <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground ring-1 ring-border">{user.e_role}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </div>
                  <div className="text-muted-foreground text-center">
                    {user.t_ban_reason ?? '—'}
                  </div>
                  <div className="text-muted-foreground text-center">
                    {user.d_ban_when
                      ? format(new Date(user.d_ban_when), 'dd/MM/yyyy HH:mm')
                      : '—'}
                  </div>
                  <div className="flex justify-center">
                    {user.d_ban_expires
                      ? <span className="text-muted-foreground">{format(new Date(user.d_ban_expires), 'dd/MM/yyyy HH:mm')}</span>
                      : <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground ring-1 ring-border">Permanente</span>}
                  </div>
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 gap-1.5"
                      onClick={() => handleUnban(user)}
                      disabled={unbanMutation.isPending}
                    >
                      <LockOpen className="size-4" />
                      Desbanir
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


export default function BanidosPage() {
  const [bannedCount, setBannedCount] = useState<number | null>(null);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Usuários Banidos' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Usuários Banidos</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Lista de usuários bloqueados do sistema
            {bannedCount !== null && (
              <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-600 ring-1 ring-red-400/40">
                {bannedCount} {bannedCount === 1 ? 'Banido' : 'Banidos'}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <BannedTable onCount={setBannedCount} />
      </main>
    </>
  );
}
