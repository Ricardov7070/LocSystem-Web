import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { DataTableSkeleton } from '../../components/DataTable/data-table-skeleton';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import CustomAlert from '../../hooks/useCustomAlert';


interface Log {
  i_user_id: string;
  v_action: string;
  j_details: Record<string, unknown> | string | null;
  v_description: string;
  created_at: string;
}


const COLS = 'grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(200px,2fr)_minmax(200px,2fr)_minmax(140px,1fr)]';

const PAGE_SIZE = 10;

const FIELD_LABELS: Record<string, string> = {
  // identificadores
  user_id:              'ID do Usuário',
  user_name:            'Nome do Usuário',
  id:                   'ID',
  vehicle_id:           'ID do Veículo',
  legal_advisory_id:    'ID da Assessoria Jurídica',
  operator_id:          'ID do Operador',
  county_id:            'ID do Município',
  file_path:            'Arquivo',
  // contato
  email:                'E-mail',
  phone:                'Telefone',
  // localização / dispositivo
  ip:                   'IP',
  device_name:          'Dispositivo',
  device_country:       'País do Dispositivo',
  device_last_seen:     'Último acesso',
  device_registered_at: 'Dispositivo registrado em',
  // acesso
  role:                 'Perfil',
  expires_at:           'Expira em',
  token:                'Token',
  // dados gerais
  name:                 'Nome',
  action:               'Ação',
  description:          'Descrição',
  status:               'Status',
  type:                 'Tipo',
  document:             'Documento',
  // endereço
  address:              'Endereço',
  city:                 'Cidade',
  state:                'Estado',
  country:              'País',
  zip_code:             'CEP',
  // financeiro
  amount:               'Valor',
  balance:              'Saldo',
  price:                'Preço',
  operator_price:       'Preço do Operador',
  preposto_price:       'Preço do Preposto',
  deputy_price:         'Preço do Preposto',
  plan:                 'Plano',
  plan_id:              'ID do Plano',
  pricing_plan:         'Plano de Preço',
  pricing_plan_id:      'ID do Plano de Preço',
  wallet_id:            'ID da Carteira',
  // booleanos
  is_active:            'Ativo',
  active:               'Ativo',
  is_courtesy:          'Cortesia',
  courtesy:             'Cortesia',
  is_blocked:           'Bloqueado',
  blocked:              'Bloqueado',
  // datas
  created_at:           'Criado em',
  updated_at:           'Atualizado em',
  deleted_at:           'Excluído em',
  // veículo
  plate:                'Placa',
  plate_mercosul:       'Placa Mercosul',
  model:                'Modelo',
  brand:                'Marca',
  color:                'Cor',
  year:                 'Ano',
  legal_advisory_name:  'Nome da Assessoria Jurídica',
  legal_advisory_access:'Acesso da Assessoria Jurídica',
  legal_advisory_access_id: 'ID do Acesso da Assessoria Jurídica',
  // limites
  user_limit:           'Limite de Usuários',
  limit:                'Limite',
};

const VALUE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  auditor: 'Assessoria',
  operator: 'Localizador',
  olheiro: 'Olheiro',
  linked_user: 'Vinculado',
  active: 'Ativo',
  inactive: 'Inativo',
  blocked: 'Bloqueado',
  unblocked: 'Desbloqueado',
  enabled: 'Habilitado',
  disabled: 'Desabilitado',
  true: 'Sim',
  false: 'Não',
  camera: 'Câmera',
  external_camera: 'Câmera Externa',
  manual: 'Manual',
};

function stripPrefix(key: string): string {
  return key.replace(/^[viedbf]_/, '');
}

function normalizeLabelKey(key: string): string {
  return stripPrefix(key)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/;

function normalizeValueKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function translateStringValue(value: string): string {
  const normalized = normalizeValueKey(value);
  return VALUE_LABELS[normalized] ?? value;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    try { return format(new Date(value), 'dd/MM/yyyy HH:mm'); } catch { /* fall through */ }
  }
  if (typeof value === 'string') return translateStringValue(value);
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(', ');
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '—';
    return entries.map(([key, item]) => `${labelFor(key)}: ${formatValue(item)}`).join(' | ');
  }
  return String(value);
}

function labelFor(key: string): string {
  const normalized = normalizeLabelKey(key);

  return FIELD_LABELS[normalized] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDetails(raw: Record<string, unknown> | string | null): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

function DetailsCell({ raw }: { raw: Record<string, unknown> | string | null }) {
  const data = parseDetails(raw);
  if (!data || Object.keys(data).length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <ul className="space-y-0.5 text-xs text-center">
      {Object.entries(data).map(([k, v]) => (
        <li key={k}>
          <span className="font-medium text-foreground">{labelFor(k)}:</span>{' '}
          <span className="text-muted-foreground">{formatValue(v)}</span>
        </li>
      ))}
    </ul>
  );
}

function SortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}


function LogsTable() {
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

  const { data: logs, isLoading, isError, error } = useQuery<Log[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const response = await api.get('/logs');
      return (response.data.logs ?? response.data.data ?? response.data ?? []) as Log[];
    },
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

  const term = search.toLowerCase();

  const filtered = (logs ?? []).filter((l) =>
    [
      l.v_action,
      l.v_description,
      String(l.i_user_id ?? ''),
      typeof l.j_details === 'string' ? l.j_details : JSON.stringify(l.j_details ?? ''),
      format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'),
    ].some((col) => col?.toLowerCase().includes(term)),
  );

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        if (sortKey === 'created_at') {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
        }
        const map: Record<string, keyof Log> = {
          i_user_id: 'i_user_id',
          v_action: 'v_action',
          v_description: 'v_description',
        };
        const key = map[sortKey];
        if (!key) return 0;
        const aVal = String(a[key] ?? '');
        const bVal = String(b[key] ?? '');
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <>
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
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('i_user_id')}>
                ID Usuário <SortIcon colKey="i_user_id" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_action')}>
                Ação <SortIcon colKey="v_action" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('v_description')}>
                Descrição <SortIcon colKey="v_description" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <div className="flex items-center justify-center gap-1">Detalhes</div>
              <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('created_at')}>
                Data <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <DataTableSkeleton columnCount={5} rowCount={6} />
          ) : filtered.length === 0 ? (
            <DataTableEmptyState
              title="Nenhum log encontrado"
              description="Não há registros de logs para exibir."
              minHeightClassName="min-h-[404px]"
            />
          ) : (
            <div className="divide-y">
              {paginated.map((log) => (
                <div
                  key={`${log.i_user_id}-${log.created_at}`}
                  className={`grid ${COLS} gap-4 p-4 text-sm items-start`}
                >
                  <div className="font-mono text-xs text-muted-foreground text-center break-all">{log.i_user_id}</div>
                  <div className="font-medium text-center break-words">{log.v_action}</div>
                  <div className="text-muted-foreground text-center break-words">{log.v_description}</div>
                  <div className="text-center">
                    <DetailsCell raw={log.j_details} />
                  </div>
                  <div className="text-muted-foreground text-xs text-center">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
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
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


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
        <LogsTable />
      </main>
    </>
  );
}
