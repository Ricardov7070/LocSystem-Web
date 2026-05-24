import { endOfDay, format, startOfDay } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cctv,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
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
import CustomAlert from '../../hooks/useCustomAlert';
import { formatDate } from '../../lib/utils';
import Loading from '../../components/ui/Loading';

type AnnouncementType =
  | 'JA_LOCALIZADO'
  | 'CONTRATO_QUITADO'
  | 'CONTRATO_SUBSTABELECIDO'
  | 'VEICULO_NAO_APTO'
  | 'VEICULO_APREENDIDO'
  | 'BA_ANDAMENTO_POR_MIM'
  | 'BA_ANDAMENTO_POR_TERCEIRO';

type UserRole = 'ADMIN' | 'AUDITOR' | 'OPERATOR' | 'OLHEIRO' | 'LINKED_USER';

type AnnouncementRecord = {
  i_id: string;
  v_plate: string;
  v_plate_mercosul: string;
  type: AnnouncementType;
  created_at: string;
  legal_advisory_name: string | null;
  wallet_name: string | null;
  user: {
    i_id: string;
    v_name: string;
    e_role: UserRole;
    operator: {
      i_id: string;
      v_name: string;
    } | null;
  } | null;
  incidence: {
    i_id: string;
    v_image: string | null;
    f_latitude: number | null;
    f_longitude: number | null;
    e_capture_method: 'MANUAL' | 'CAMERA' | 'EXTERNAL_CAMERA';
    f_confidence: number | null;
  } | null;
};

const announcementLabels: Record<AnnouncementType, string> = {
  JA_LOCALIZADO: 'Já Localizado',
  CONTRATO_QUITADO: 'Contrato Quitado',
  CONTRATO_SUBSTABELECIDO: 'Contrato Substabelecido',
  VEICULO_NAO_APTO: 'Veículo Não Apto',
  VEICULO_APREENDIDO: 'Veículo Apreendido',
  BA_ANDAMENTO_POR_MIM: 'B.A em andamento',
  BA_ANDAMENTO_POR_TERCEIRO: 'B.A por Terceiro',
};

const announcementMessages: Record<AnnouncementType, string[]> = {
  JA_LOCALIZADO: ['Veículo com registro de incidência anterior.'],
  CONTRATO_QUITADO: [
    'Veículo com registro de incidência anterior.',
    'Usuário atribuiu a esta placa status de contrato quitado.',
  ],
  CONTRATO_SUBSTABELECIDO: [
    'Veículo com registro de incidência anterior.',
    'Usuário atribuiu a esta placa status de contrato substabelecido.',
  ],
  VEICULO_NAO_APTO: [
    'Veículo com registro de incidência anterior.',
    'Usuário atribuiu a esta placa status de inapto.',
  ],
  VEICULO_APREENDIDO: [
    'Veículo com registro de incidência anterior.',
    'Veículo foi apreendido.',
  ],
  BA_ANDAMENTO_POR_MIM: [
    'Veículo com registro de incidência anterior.',
    'Busca e apreensão em andamento pelo próprio usuário.',
  ],
  BA_ANDAMENTO_POR_TERCEIRO: [
    'Veículo com registro de incidência anterior.',
    'Busca e apreensão em andamento por terceiro.',
  ],
};

const announcementColors: Record<AnnouncementType, string> = {
  JA_LOCALIZADO: 'bg-red-50 text-red-600',
  CONTRATO_QUITADO: 'bg-red-50 text-red-600',
  CONTRATO_SUBSTABELECIDO: 'bg-red-50 text-red-600',
  VEICULO_NAO_APTO: 'bg-red-50 text-red-600',
  VEICULO_APREENDIDO: 'bg-red-50 text-red-600',
  BA_ANDAMENTO_POR_MIM: 'bg-blue-50 text-blue-600',
  BA_ANDAMENTO_POR_TERCEIRO: 'bg-red-50 text-red-600',
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  AUDITOR: 'Assessoria',
  OPERATOR: 'Localizador',
  OLHEIRO: 'Olheiro',
  LINKED_USER: 'Vinculado',
};

const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-50 text-red-600',
  AUDITOR: 'bg-blue-50 text-blue-600',
  OPERATOR: 'bg-green-50 text-green-600',
  OLHEIRO: 'bg-orange-50 text-orange-600',
  LINKED_USER: 'bg-zinc-100 text-zinc-700',
};

const PAGE_SIZE = 10;
const GRID_TEMPLATE_COLUMNS =
  'minmax(110px,1fr) minmax(180px,1.6fr) minmax(140px,1fr) minmax(160px,1.3fr) minmax(150px,1.2fr) minmax(140px,1fr) minmax(170px,1.2fr) 80px';

function SortIcon({
  colKey,
  sortKey,
  sortDir,
}: {
  colKey: string;
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
}) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

function getDisplayPlate(record: AnnouncementRecord) {
  return [record.v_plate, record.v_plate_mercosul].find((plate) => plate && plate !== '-') ?? '—';
}

function getSecondaryPlate(record: AnnouncementRecord) {
  const displayPlate = getDisplayPlate(record);
  return [record.v_plate, record.v_plate_mercosul].find((plate) => plate && plate !== '-' && plate !== displayPlate) ?? null;
}

function getResponsibleLabel(record: AnnouncementRecord) {
  return record.user?.v_name ?? '—';
}

function getResponsibleHelper(record: AnnouncementRecord) {
  if (record.user?.e_role === 'OLHEIRO' && record.user.operator) {
    return `Responsável: ${record.user.operator.v_name}`;
  }

  return null;
}

function getRoleLabel(role: UserRole | undefined) {
  if (!role) return '—';
  return roleLabels[role] ?? role;
}

function getRoleColor(role: UserRole | undefined) {
  if (!role) return 'bg-zinc-100 text-zinc-700';
  return roleColors[role] ?? 'bg-zinc-100 text-zinc-700';
}

function buildAnnouncementBody(dateRange: DateRange | undefined) {
  const body: Record<string, string | number> = {};

  if (dateRange?.from && dateRange?.to) {
    body.data_inicial = format(dateRange.from, 'yyyy-MM-dd');
    body.data_final = format(dateRange.to, 'yyyy-MM-dd');
  } else {
    body.limit = 30;
  }

  return body;
}

function VehicleAnnouncementsTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [announcementType, setAnnouncementType] = useState<'all' | AnnouncementType>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [selectedType, setSelectedType] = useState<AnnouncementType | ''>('');

  const { data: announcements, isLoading, isError, error } = useQuery<AnnouncementRecord[]>({
    queryKey: ['vehicle-announcements', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const response = await api.post('/vehicle-announcements', buildAnnouncementBody(dateRange));
      return (response.data.vehicleAnnouncements ?? response.data.data ?? response.data ?? []) as AnnouncementRecord[];
    },
    throwOnError: false,
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: AnnouncementType }) => {
      const response = await api.put(`/vehicle-announcements/${id}/type`, { type });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/vehicle-announcements/${id}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (!isError) return;

    const status = (error as any)?.response?.status;
    if (status === 401) {
      setAlertInfo({ message: (error as any)?.response?.data?.info ?? 'Acesso não autorizado ao módulo.', type: 'warning' });
      return;
    }

    setAlertInfo({
      message: (error as any)?.response?.data?.info ?? (error as any)?.response?.data?.error ?? 'Erro ao carregar comunicados.',
      type: 'error',
    });
  }, [isError, error]);

  async function refreshAnnouncements() {
    await queryClient.invalidateQueries({ queryKey: ['vehicle-announcements'] });
    await queryClient.refetchQueries({ queryKey: ['vehicle-announcements'], type: 'active' });
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDir('asc');
  }

  async function handleShowDetails(record: AnnouncementRecord) {
    const messages = announcementMessages[record.type] ?? [];
    const helper = getResponsibleHelper(record);
    const hasImage = Boolean(record.incidence?.v_image);
    const hasLocation =
      record.incidence?.f_latitude != null &&
      record.incidence?.f_longitude != null &&
      record.incidence.f_latitude !== 0 &&
      record.incidence.f_longitude !== 0;

    await dialog.info(`Comunicado de ${getDisplayPlate(record)}`, {
      contentClassname: 'max-w-5xl w-full',
      closeText: 'Cancelar',
      info: (
        <div className="space-y-6">
          <div className="rounded-lg bg-muted/30 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Placa</div>
                <div className="text-sm font-semibold">{getDisplayPlate(record)}</div>
                {getSecondaryPlate(record) ? (
                  <div className="text-xs text-muted-foreground">Alternativa: {getSecondaryPlate(record)}</div>
                ) : null}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Usuário</div>
                <div className="text-sm font-semibold">{getResponsibleLabel(record)}</div>
                {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Tipo de acesso</div>
                <div className="text-sm font-semibold">{getRoleLabel(record.user?.e_role)}</div>
              </div>

              {record.incidence?.e_capture_method ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Método</div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {record.incidence.e_capture_method === 'EXTERNAL_CAMERA' || record.incidence.e_capture_method === 'CAMERA' ? (
                      <Cctv className="size-4" />
                    ) : null}
                    <span>
                      {record.incidence.e_capture_method === 'EXTERNAL_CAMERA'
                        ? 'Câmera Externa'
                        : record.incidence.e_capture_method === 'CAMERA'
                          ? 'Câmera'
                          : 'Manual'}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Criado em</div>
                <div className="text-sm font-semibold">{formatDate(record.created_at)}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Assessoria</div>
                <div className="text-sm font-semibold">{record.legal_advisory_name ?? '—'}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Carteira</div>
                <div className="text-sm font-semibold">{record.wallet_name ?? '—'}</div>
              </div>

              {record.incidence?.f_confidence != null ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Confiança OCR</div>
                  <div
                    className={`text-sm font-semibold ${
                      record.incidence.f_confidence >= 0.8
                        ? 'text-green-600'
                        : record.incidence.f_confidence >= 0.6
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {Math.round(record.incidence.f_confidence * 100)}%
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Comunicado</div>
            <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${announcementColors[record.type]}`}>
              {announcementLabels[record.type]}
            </div>
            <div className="mt-3 space-y-1">
              {messages.map((message) => (
                <p key={message} className="text-sm text-muted-foreground">
                  {message}
                </p>
              ))}
            </div>
          </div>

          {hasImage || hasLocation ? (
            <div className={`grid gap-4 ${hasImage && hasLocation ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
              {hasImage ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Imagem da placa</div>
                  <div className="flex h-80 items-center justify-center overflow-hidden rounded-md border bg-muted/20 p-2">
                    <img
                      src={record.incidence?.v_image ?? ''}
                      alt={`Incidência da placa ${getDisplayPlate(record)}`}
                      className="h-full w-full rounded-md object-contain"
                    />
                  </div>
                </div>
              ) : null}

              {hasLocation ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Localização do veículo</div>
                  <div className="h-80 overflow-hidden rounded-md border">
                    <iframe
                      src={`https://www.google.com/maps?q=${record.incidence?.f_latitude},${record.incidence?.f_longitude}&output=embed`}
                      className="h-full w-full rounded-md"
                      allowFullScreen
                      loading="lazy"
                    ></iframe>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    });
  }

  async function handleDelete(record: AnnouncementRecord) {
    const confirmed = await dialog.confirm('Remover comunicado', {
      description: `Deseja remover o comunicado da placa ${getDisplayPlate(record)}?`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(record.i_id);
      setAlertInfo({ message: response?.success ?? 'Comunicado removido com sucesso.', type: 'success' });
      await refreshAnnouncements();
    } catch (err: any) {
      setAlertInfo({
        message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao remover comunicado.',
        type: 'error',
      });
    }
  }

  async function handleSaveType() {
    if (!editingAnnouncement || !selectedType) return;

    try {
      const response = await updateTypeMutation.mutateAsync({
        id: editingAnnouncement.i_id,
        type: selectedType,
      });

      setAlertInfo({ message: response?.success ?? 'Tipo de comunicado alterado com sucesso.', type: 'success' });
      setEditingAnnouncement(null);
      setSelectedType('');
      await refreshAnnouncements();
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (fieldErrors?.type?.[0]) {
        setAlertInfo({ message: fieldErrors.type[0], type: 'warning' });
        return;
      }

      setAlertInfo({
        message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao atualizar tipo do comunicado.',
        type: 'error',
      });
    }
  }

  const filtered = (announcements ?? []).filter((record) => {
    const term = search.toLowerCase();
    const matchesSearch = [
      getDisplayPlate(record),
      getSecondaryPlate(record) ?? '',
      record.user?.v_name ?? '',
      record.user?.operator?.v_name ?? '',
      getRoleLabel(record.user?.e_role),
      record.legal_advisory_name ?? '',
      record.wallet_name ?? '',
      announcementLabels[record.type],
    ].some((value) => value.toLowerCase().includes(term));

    if (!matchesSearch) return false;
    if (announcementType !== 'all' && record.type !== announcementType) return false;
    if (!dateRange?.from || !dateRange?.to) return true;

    const createdAt = new Date(record.created_at);
    if (Number.isNaN(createdAt.getTime())) return false;

    return createdAt >= startOfDay(dateRange.from) && createdAt <= endOfDay(dateRange.to);
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const getValue = (record: AnnouncementRecord) => {
          if (sortKey === 'plate') return getDisplayPlate(record);
          if (sortKey === 'user') return getResponsibleLabel(record);
          if (sortKey === 'role') return getRoleLabel(record.user?.e_role);
          if (sortKey === 'advisory') return record.legal_advisory_name ?? '';
          if (sortKey === 'wallet') return record.wallet_name ?? '';
          if (sortKey === 'type') return announcementLabels[record.type];
          if (sortKey === 'created_at') return new Date(record.created_at).getTime();
          return '';
        };

        const aValue = getValue(a);
        const bValue = getValue(b);

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDir === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return sortDir === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, announcementType, dateRange]);

  useEffect(() => {
    if (!editingAnnouncement) {
      setSelectedType('');
      return;
    }

    setSelectedType(editingAnnouncement.type);
  }, [editingAnnouncement]);

  return (
    <>
      {(updateTypeMutation.isPending || deleteMutation.isPending) && <Loading />}
      {alertInfo ? (
        <div className="fixed right-4 top-4 z-[9999]">
          <CustomAlert
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      ) : null}

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Veículos com Comunicados</h1>
          <p className="text-muted-foreground">
            Gerenciamento de comunicados de veículos
            <span className="ml-2 text-sm font-medium text-blue-600">
              ({filtered.length} comunicado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''})
            </span>
          </p>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Pesquisar por placa, usuário ou assessoria..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-72"
              />

              <Select value={announcementType} onValueChange={(value) => setAnnouncementType(value as 'all' | AnnouncementType)}>
                <SelectTrigger className="w-auto min-w-[16rem]">
                  <SelectValue placeholder="Tipo de comunicado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os comunicados</SelectItem>
                  {Object.entries(announcementLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Filtrar por criado em"
              triggerSize="sm"
              triggerClassName="w-56 sm:w-60"
              align="end"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            A carga inicial exibe apenas os 30 comunicados mais recentes. Use os filtros para refinar ou ampliar a consulta.
          </p>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="sticky top-0 z-10 border-b bg-background">
              <div
                className="grid gap-3 p-3 text-sm font-medium text-muted-foreground"
                style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
              >
                <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('plate')}>
                  Placa <SortIcon colKey="plate" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1 text-center hover:text-foreground transition-colors" onClick={() => handleSort('user')}>
                  Responsável <SortIcon colKey="user" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1 text-center hover:text-foreground transition-colors" onClick={() => handleSort('role')}>
                  Tipo de Acesso <SortIcon colKey="role" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1 text-center hover:text-foreground transition-colors" onClick={() => handleSort('advisory')}>
                  Assessoria <SortIcon colKey="advisory" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1 text-center hover:text-foreground transition-colors" onClick={() => handleSort('wallet')}>
                  Carteira <SortIcon colKey="wallet" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1 text-center hover:text-foreground transition-colors" onClick={() => handleSort('created_at')}>
                  Criado em <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <button className="flex items-center justify-center gap-1 text-center hover:text-foreground transition-colors" onClick={() => handleSort('type')}>
                  Comunicado <SortIcon colKey="type" sortKey={sortKey} sortDir={sortDir} />
                </button>
                <div className="text-center">Ações</div>
              </div>
            </div>

            {isLoading ? (
              <DataTableSkeleton columnCount={8} rowCount={6} />
            ) : filtered.length === 0 ? (
              <DataTableEmptyState
                title="Nenhum comunicado encontrado"
                description="Nenhum veículo com comunicados corresponde aos filtros aplicados."
                minHeightClassName="min-h-[404px]"
              />
            ) : (
              <div className="divide-y">
                {paginated.map((record) => (
                  <div
                    key={record.i_id}
                    className="grid items-center gap-3 p-3 text-sm"
                    style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 border-b border-transparent font-medium transition-colors hover:border-primary hover:text-primary"
                        onClick={() => handleShowDetails(record)}
                      >
                        <span>{getDisplayPlate(record)}</span>
                        <ExternalLink className="size-3.5" />
                      </button>
                      {getSecondaryPlate(record) ? (
                        <div className="text-xs text-muted-foreground">{getSecondaryPlate(record)}</div>
                      ) : null}
                    </div>

                    <div className="min-w-0 text-center">
                      <div className="font-medium">{getResponsibleLabel(record)}</div>
                      {getResponsibleHelper(record) ? (
                        <div className="truncate text-xs text-muted-foreground">{getResponsibleHelper(record)}</div>
                      ) : null}
                    </div>

                    <div className="text-center">
                      {record.user?.e_role ? (
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleColor(record.user.e_role)}`}>
                          {getRoleLabel(record.user.e_role)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>

                    <div className="truncate text-center text-muted-foreground">{record.legal_advisory_name ?? '—'}</div>
                    <div className="truncate text-center text-muted-foreground">{record.wallet_name ?? '—'}</div>
                    <div className="text-center text-muted-foreground">{formatDate(record.created_at)}</div>

                    <div className="text-center">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${announcementColors[record.type]}`}>
                        {announcementLabels[record.type]}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingAnnouncement(record);
                              setSelectedType(record.type);
                            }}
                          >
                            <Pencil className="mr-2 size-4" />
                            Alterar Tipo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(record)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isLoading && sorted.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} registros
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span className="px-1">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <Dialog
        open={Boolean(editingAnnouncement)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAnnouncement(null);
            setSelectedType('');
          }
        }}
      >
        <DialogContent className="w-[360px]">
          <DialogHeader>
            <DialogTitle>Alterar Tipo — {editingAnnouncement ? getDisplayPlate(editingAnnouncement) : ''}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedType || undefined} onValueChange={(value) => setSelectedType(value as AnnouncementType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(announcementLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingAnnouncement(null);
                setSelectedType('');
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!selectedType || selectedType === editingAnnouncement?.type || updateTypeMutation.isPending}
              onClick={handleSaveType}
            >
              {updateTypeMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function VehicleAnnouncementsPage() {
  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Veículos com Comunicados' }]} />
      <VehicleAnnouncementsTable />
    </>
  );
}
