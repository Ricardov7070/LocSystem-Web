import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cctv,
  ExternalLink,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import { DateRangePicker } from '../../components/DateRangePicker';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import Loading from '../../components/ui/Loading';
import { useAuth } from '../../components/providers/auth';
import CustomAlert from '../../hooks/useCustomAlert';
import { cn } from '../../lib/utils';
import {
  buildIncidenceParams,
  getCaptureMethodLabel,
  getDisplayUserName,
  getRetroactiveGridColumns,
  getRoleColor,
  getRoleLabel,
  IncidenceDetailsContent,
  PAGE_SIZE,
  resolveUserRole,
  type CaptureMethod,
  type IncidenceRecord,
} from './shared';

type SortKey = 'plate' | 'responsible' | 'typeAccess' | 'legalAdvisory' | 'wallet' | 'captureMethod' | 'confidence' | 'createdAt';

function SortIcon({
  colKey,
  sortKey,
  sortDir,
}: {
  colKey: SortKey;
  sortKey: SortKey | null;
  sortDir: 'asc' | 'desc';
}) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

function RetroactiveIncidencesTable() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [captureMethod, setCaptureMethod] = useState<'all' | CaptureMethod>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const { data: incidences = [], isLoading, isError, error } = useQuery<IncidenceRecord[]>({
    queryKey: ['retroactive-incidences', search, captureMethod, showOnlyUnread, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const response = await api.get('/retroactive-incidences', {
        params: buildIncidenceParams({ search, captureMethod, dateRange, onlyUnread: showOnlyUnread }),
      });

      return (response.data.incidences ?? response.data.data ?? []) as IncidenceRecord[];
    },
    throwOnError: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/retroactive-incidences/${id}/read`);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/incidences-history/${id}`);
      return response.data;
    },
  });

  useEffect(() => {
    setPage(1);
  }, [search, captureMethod, showOnlyUnread, dateRange?.from, dateRange?.to]);

  useEffect(() => {
    if (!isError) return;

    setAlertInfo({
      message:
        (error as any)?.response?.data?.info ??
        (error as any)?.response?.data?.error ??
        'Erro ao carregar incidências retroativas.',
      type: 'error',
    });
  }, [isError, error]);

  async function refreshRetroactive() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['retroactive-incidences'] }),
      queryClient.invalidateQueries({ queryKey: ['retroactive-incidences-count'] }),
      queryClient.invalidateQueries({ queryKey: ['retroactive-incidences-header-count'] }),
      queryClient.invalidateQueries({ queryKey: ['incidences-history'] }),
      queryClient.invalidateQueries({ queryKey: ['incidences-history-header-count'] }),
    ]);
  }

  function handleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(column);
    setSortDir(column === 'createdAt' ? 'desc' : 'asc');
  }

  const sortedIncidences = useMemo(() => {
    const items = [...incidences];

    if (!sortKey) {
      return items;
    }

    items.sort((left, right) => {
      const leftUser = getDisplayUserName(user.role, left);
      const rightUser = getDisplayUserName(user.role, right);
      const leftRole = resolveUserRole(left);
      const rightRole = resolveUserRole(right);
      const leftAdvisory = left.vehicle?.managedBy?.legalAdvisory?.name ?? '';
      const rightAdvisory = right.vehicle?.managedBy?.legalAdvisory?.name ?? '';
      const leftWallet = left.vehicle?.managedBy?.wallet?.name ?? '';
      const rightWallet = right.vehicle?.managedBy?.wallet?.name ?? '';

      let result = 0;

      switch (sortKey) {
        case 'plate':
          result = left.plate.localeCompare(right.plate, 'pt-BR');
          break;
        case 'responsible':
          result = leftUser.userName.localeCompare(rightUser.userName, 'pt-BR');
          break;
        case 'typeAccess':
          result = getRoleLabel(leftRole).localeCompare(getRoleLabel(rightRole), 'pt-BR');
          break;
        case 'legalAdvisory':
          result = leftAdvisory.localeCompare(rightAdvisory, 'pt-BR');
          break;
        case 'wallet':
          result = leftWallet.localeCompare(rightWallet, 'pt-BR');
          break;
        case 'captureMethod':
          result = getCaptureMethodLabel(left.captureMethod).localeCompare(getCaptureMethodLabel(right.captureMethod), 'pt-BR');
          break;
        case 'confidence':
          result = (left.confidence ?? -1) - (right.confidence ?? -1);
          break;
        case 'createdAt':
          result = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
          break;
      }

      return sortDir === 'asc' ? result : result * -1;
    });

    return items;
  }, [incidences, sortDir, sortKey, user.role]);

  const totalPages = Math.max(1, Math.ceil(sortedIncidences.length / PAGE_SIZE));
  const paginatedIncidences = sortedIncidences.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showTypeOfAccessColumn = user.role !== 'AUDITOR';
  const showConfidenceColumn = user.role === 'ADMIN';
  const gridTemplateColumns = getRetroactiveGridColumns(user.role);

  async function handleShowDetails(incidence: IncidenceRecord) {
    if (incidence.retroactive && !incidence.retroactive.isRead) {
      try {
        await markAsReadMutation.mutateAsync(incidence.retroactive.id);
        await refreshRetroactive();
      } catch {
      }
    }

    await dialog.info(`Incidência de ${incidence.plate}`, {
      contentClassname: 'max-w-3xl w-full',
      info: <IncidenceDetailsContent incidence={incidence} currentUserRole={user.role} dateLabel="Data e Horário de Registro" />,
    });
  }

  async function handleDelete(incidence: IncidenceRecord) {
    const confirmed = await dialog.confirm(`Deseja remover a incidência ${incidence.plate}?`);

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(incidence.id);
      await refreshRetroactive();
      setAlertInfo({ message: `Incidência ${incidence.plate} removida com sucesso.`, type: 'success' });
    } catch (mutationError: any) {
      setAlertInfo({
        message:
          mutationError?.response?.data?.info ??
          mutationError?.response?.data?.error ??
          'Não foi possível remover a incidência.',
        type: 'error',
      });
    }
  }

  return (
    <div className="space-y-4">
      {alertInfo ? <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} /> : null}
      {deleteMutation.isPending || markAsReadMutation.isPending ? <Loading /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Pesquisar por placa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-64"
          />

          <Select value={captureMethod} onValueChange={(value) => setCaptureMethod(value as 'all' | CaptureMethod)}>
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

          <Button type="button" variant={showOnlyUnread ? 'default' : 'outline'} onClick={() => setShowOnlyUnread((current) => !current)}>
            {showOnlyUnread ? 'Exibindo não lidas' : 'Mostrar não lidas'}
          </Button>
        </div>

        <DateRangePicker
          date={dateRange}
          onDateChange={(range) => setDateRange(range)}
          placeholder="Selecione as datas"
          triggerSize="sm"
          triggerClassName="w-56 sm:w-60"
          align="end"
        />
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={showConfidenceColumn ? 8 : 7} rowCount={6} searchableColumnCount={3} showViewOptions={false} />
      ) : sortedIncidences.length === 0 ? (
        <div className="rounded-lg border bg-background">
          <DataTableEmptyState
            title="Nenhuma incidência retroativa encontrada"
            description={search ? 'Nenhuma incidência retroativa corresponde aos filtros aplicados.' : 'Você não possui incidências retroativas no momento.'}
            minHeightClassName="min-h-[420px]"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-auto rounded-lg border bg-background">
            <div className="min-w-[1160px]">
              <div className="sticky top-0 z-10 border-b bg-background">
                <div className="grid gap-3 p-3 text-sm font-medium text-muted-foreground" style={{ gridTemplateColumns }}>
                  <button type="button" className="flex items-center gap-1 text-left" onClick={() => handleSort('plate')}>
                    Placa
                    <SortIcon colKey="plate" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center gap-1 text-left" onClick={() => handleSort('responsible')}>
                    Responsável
                    <SortIcon colKey="responsible" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  {showTypeOfAccessColumn ? (
                    <button type="button" className="flex items-center gap-1 text-left" onClick={() => handleSort('typeAccess')}>
                      Tipo de Acesso
                      <SortIcon colKey="typeAccess" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  ) : null}
                  <button type="button" className="flex items-center gap-1 text-left" onClick={() => handleSort('legalAdvisory')}>
                    Assessoria
                    <SortIcon colKey="legalAdvisory" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center gap-1 text-left" onClick={() => handleSort('wallet')}>
                    Carteira
                    <SortIcon colKey="wallet" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  <button type="button" className="flex items-center gap-1 text-left" onClick={() => handleSort('captureMethod')}>
                    Método
                    <SortIcon colKey="captureMethod" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                  {showConfidenceColumn ? (
                    <button type="button" className="flex items-center gap-1 text-left" onClick={() => handleSort('confidence')}>
                      Confiança
                      <SortIcon colKey="confidence" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  ) : null}
                  <div>Ações</div>
                </div>
              </div>

              <div>
                {paginatedIncidences.map((incidence) => {
                  const userInfo = getDisplayUserName(user.role, incidence);
                  const userRole = resolveUserRole(incidence);
                  const isUnread = Boolean(incidence.retroactive) && !incidence.retroactive?.isRead;

                  return (
                    <div
                      key={incidence.retroactive?.id ?? incidence.id}
                      className={cn('grid items-center gap-3 border-b p-3 text-sm last:border-b-0 hover:bg-muted/50', isUnread && 'bg-primary/5')}
                      style={{ gridTemplateColumns }}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-left font-medium transition-colors hover:text-primary"
                        onClick={() => handleShowDetails(incidence)}
                      >
                        {isUnread ? <span aria-hidden="true" className="inline-flex size-2 rounded-full bg-primary" /> : null}
                        <span>{incidence.plate}</span>
                        <ExternalLink className="size-3.5" />
                      </button>

                      <div>
                        {userInfo.isOlheiro ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{userInfo.olheiroName}</span>
                            <span className="text-xs text-muted-foreground">Responsável: {userInfo.operatorName}</span>
                          </div>
                        ) : (
                          userInfo.userName
                        )}
                      </div>

                      {showTypeOfAccessColumn ? (
                        <div>
                          {userRole ? (
                            <span className={cn('rounded-full px-2 py-1 text-xs font-medium', getRoleColor(userRole))}>
                              {getRoleLabel(userRole)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      ) : null}

                      <div>{incidence.vehicle?.managedBy?.legalAdvisory?.name ?? '—'}</div>
                      <div>{incidence.vehicle?.managedBy?.wallet?.name ?? '—'}</div>
                      <div>
                        {incidence.captureMethod === 'EXTERNAL_CAMERA' ? (
                          <div className="flex items-center gap-1.5">
                            <Cctv className="size-4" />
                            <span>Câmera Externa</span>
                          </div>
                        ) : (
                          getCaptureMethodLabel(incidence.captureMethod)
                        )}
                      </div>
                      {showConfidenceColumn ? (
                        <div>
                          {typeof incidence.confidence === 'number' ? (
                            <span className="font-medium">{Math.round(incidence.confidence * 100)}%</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      ) : null}
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label="Abrir menu" variant="ghost" className="flex size-8 p-0 data-[state=open]:bg-muted">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onSelect={() => handleDelete(incidence)}>
                              <Trash2 className="mr-2 size-4" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Exibindo {paginatedIncidences.length} de {sortedIncidences.length} incidências retroativas
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IncidencesRetroactivePage() {
  const { data: totalCount = 0 } = useQuery<number>({
    queryKey: ['retroactive-incidences-header-count'],
    queryFn: async () => {
      const response = await api.get('/retroactive-incidences/count');
      return Number(response.data.count ?? 0);
    },
    staleTime: 15000,
  });

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Incidências' }, { label: 'Retroativas' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Incidências Retroativas</h1>
          <p className="text-muted-foreground">
            Gerenciamento de Incidências retroativas
            <span className="ml-2 text-sm font-medium text-blue-600">
              ({totalCount} incidência{totalCount !== 1 ? 's' : ''} retroativa{totalCount !== 1 ? 's' : ''})
            </span>
          </p>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <RetroactiveIncidencesTable />
      </main>
    </>
  );
}
