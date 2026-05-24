import { format } from 'date-fns';
import { Cctv } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

export type UserRole = 'ADMIN' | 'AUDITOR' | 'OPERATOR' | 'OLHEIRO' | 'LINKED_USER';
export type CaptureMethod = 'MANUAL' | 'CAMERA' | 'EXTERNAL_CAMERA';

export type IncidenceUser = {
  id: string;
  name: string;
  phone: string | null;
  role: UserRole | null;
  operator: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
} | null;

export type IncidenceVehicle = {
  id: string;
  plate: string | null;
  plateMercosul: string | null;
  model: string | null;
  phone: string | null;
  managedBy: {
    legalAdvisory: {
      id: string;
      name: string;
      phone: string | null;
      document: string | null;
    } | null;
    wallet: {
      id: string;
      name: string;
    } | null;
  } | null;
} | null;

export type RetroactiveMeta = {
  id: string;
  ownerType: string;
  ownerId: string;
  source: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string | null;
};

export type IncidenceRecord = {
  id: string;
  plate: string;
  plateMercosul: string | null;
  vehicleId: string | null;
  userId: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  confidence: number | null;
  createdAt: string;
  positive: boolean;
  captureMethod: CaptureMethod;
  user: IncidenceUser;
  vehicle: IncidenceVehicle;
  retroactive?: RetroactiveMeta;
};

export const PAGE_SIZE = 10;

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

export function buildIncidenceParams({
  search,
  positive,
  captureMethod,
  dateRange,
  onlyUnread,
}: {
  search?: string;
  positive?: 'all' | 'true' | 'false';
  captureMethod?: 'all' | CaptureMethod;
  dateRange?: DateRange;
  onlyUnread?: boolean;
}) {
  const params: Record<string, string> = {};

  if (search?.trim()) {
    params.search = search.trim();
  }

  if (positive && positive !== 'all') {
    params.positive = positive;
  }

  if (captureMethod && captureMethod !== 'all') {
    params.captureMethod = captureMethod;
  }

  if (dateRange?.from) {
    params.data_inicial = format(dateRange.from, 'yyyy-MM-dd');
  }

  if (dateRange?.to) {
    params.data_final = format(dateRange.to, 'yyyy-MM-dd');
  }

  if (onlyUnread) {
    params.only_unread = 'true';
  }

  return params;
}

export function getRoleLabel(role: UserRole | null | undefined) {
  if (!role) return '—';
  return roleLabels[role] ?? role;
}

export function getRoleColor(role: UserRole | null | undefined) {
  if (!role) return 'bg-zinc-100 text-zinc-700';
  return roleColors[role] ?? 'bg-zinc-100 text-zinc-700';
}

export function resolveUserRole(incidence: IncidenceRecord): UserRole | undefined {
  if (incidence.user?.role) {
    return incidence.user.role;
  }

  if (incidence.user?.operator) {
    return 'OLHEIRO';
  }

  return undefined;
}

export function getDisplayUserName(currentUserRole: string, incidence: IncidenceRecord) {
  const userRole = resolveUserRole(incidence);

  if (currentUserRole === 'AUDITOR' && userRole === 'OLHEIRO' && incidence.user?.operator) {
    return {
      isOlheiro: false,
      userName: incidence.user.operator.name,
    };
  }

  if (userRole === 'OLHEIRO' && incidence.user?.operator) {
    return {
      isOlheiro: true,
      olheiroName: incidence.user.name,
      operatorName: incidence.user.operator.name,
      userName: incidence.user.name,
    };
  }

  return {
    isOlheiro: false,
    userName: incidence.user?.name ?? '—',
  };
}

export function getResponsibleOperator(incidence: IncidenceRecord) {
  const userRole = resolveUserRole(incidence);

  if (!incidence.user) {
    return null;
  }

  if (userRole === 'OPERATOR' || (!userRole && !incidence.user.operator)) {
    return {
      name: incidence.user.name,
      phone: incidence.user.phone,
    };
  }

  if (incidence.user.operator) {
    return {
      name: incidence.user.operator.name,
      phone: incidence.user.operator.phone,
    };
  }

  return null;
}

export function getCaptureMethodLabel(captureMethod: CaptureMethod) {
  if (captureMethod === 'CAMERA') return 'Câmera';
  if (captureMethod === 'EXTERNAL_CAMERA') return 'Câmera Externa';
  return 'Manual';
}

export function formatTableDateTime(value: string | null | undefined) {
  if (!value) return '—';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return format(parsedDate, 'dd/MM/yyyy HH:mm');
}

export function getHistoryGridColumns(userRole: string) {
  const showTypeOfAccessColumn = userRole !== 'AUDITOR';
  const showConfidenceColumn = userRole === 'ADMIN';

  const columns = ['minmax(120px,1fr)', 'minmax(190px,1.4fr)'];

  if (showTypeOfAccessColumn) {
    columns.push('minmax(140px,1fr)');
  }

  columns.push('minmax(170px,1.2fr)');
  columns.push('minmax(150px,1.1fr)');
  columns.push('minmax(150px,1.1fr)');
  columns.push('120px');
  columns.push('120px');

  if (showConfidenceColumn) {
    columns.push('100px');
  }

  columns.push('80px');

  return columns.join(' ');
}

export function getRetroactiveGridColumns(userRole: string) {
  const showTypeOfAccessColumn = userRole !== 'AUDITOR';
  const showConfidenceColumn = userRole === 'ADMIN';

  const columns = ['minmax(120px,1fr)', 'minmax(190px,1.4fr)'];

  if (showTypeOfAccessColumn) {
    columns.push('minmax(140px,1fr)');
  }

  columns.push('minmax(170px,1.2fr)');
  columns.push('minmax(150px,1.1fr)');
  columns.push('minmax(130px,1fr)');

  if (showConfidenceColumn) {
    columns.push('100px');
  }

  columns.push('80px');

  return columns.join(' ');
}

export function IncidenceDetailsContent({
  incidence,
  currentUserRole,
  dateLabel = 'Data e Horário',
}: {
  incidence: IncidenceRecord;
  currentUserRole: string;
  dateLabel?: string;
}) {
  const userInfo = getDisplayUserName(currentUserRole, incidence);
  const responsibleOperator = getResponsibleOperator(incidence);
  const operatorPhone = responsibleOperator?.phone?.trim() || null;
  const showConfidence = currentUserRole === 'ADMIN';
  const canViewLocation = currentUserRole !== 'AUDITOR';

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/30 p-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="flex flex-col space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Placa</span>
            <span className="text-sm font-semibold">{incidence.plate}</span>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Usuário</span>
            {userInfo.isOlheiro ? (
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{userInfo.olheiroName}</span>
                <span className="text-xs text-muted-foreground">Responsável: {userInfo.operatorName}</span>
              </div>
            ) : (
              <span className="text-sm font-semibold">{userInfo.userName}</span>
            )}
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Método</span>
            {incidence.captureMethod === 'EXTERNAL_CAMERA' ? (
              <div className="flex items-center gap-1.5">
                <Cctv className="size-4" />
                <span className="text-sm font-semibold">Câmera Externa</span>
              </div>
            ) : (
              <span className="text-sm font-semibold">{getCaptureMethodLabel(incidence.captureMethod)}</span>
            )}
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Resultado</span>
            <span className={incidence.positive ? 'text-sm font-semibold text-green-600' : 'text-sm font-semibold text-orange-600'}>
              {incidence.positive ? 'Positivo' : 'Negativo'}
            </span>
          </div>

          {showConfidence ? (
            <div className="flex flex-col space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Confiança OCR</span>
              <span className="text-sm font-semibold">
                {typeof incidence.confidence === 'number' ? `${Math.round(incidence.confidence * 100)}%` : 'Não disponível'}
              </span>
            </div>
          ) : null}

          <div className="flex flex-col space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{dateLabel}</span>
            <span className="text-sm font-semibold">{formatTableDateTime(incidence.createdAt)}</span>
          </div>

          {['ADMIN', 'AUDITOR'].includes(currentUserRole) ? (
            <div className="flex flex-col space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Contato do Localizador</span>
              <span className="text-sm font-semibold">{operatorPhone || 'Não informado'}</span>
            </div>
          ) : null}

          {incidence.vehicle ? (
            <>
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Assessoria</span>
                <span className="text-sm font-semibold">{incidence.vehicle.managedBy?.legalAdvisory?.name ?? '—'}</span>
              </div>

              <div className="flex flex-col space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Carteira</span>
                <span className="text-sm font-semibold">{incidence.vehicle.managedBy?.wallet?.name ?? '—'}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-start">
        {incidence.image ? (
          <div className="flex flex-1 justify-center overflow-hidden">
            <img
              src={incidence.image}
              alt={`Imagem da placa ${incidence.plate}`}
              className="h-80 w-80 rounded-md border object-contain"
            />
          </div>
        ) : null}

        {canViewLocation &&
        incidence.latitude !== null &&
        incidence.latitude !== 0 &&
        incidence.longitude !== null &&
        incidence.longitude !== 0 ? (
          <div className="flex flex-1 justify-center">
            <iframe
              src={`https://www.google.com/maps?q=${incidence.latitude},${incidence.longitude}&output=embed`}
              className="h-80 w-full max-w-md rounded-md border"
              allowFullScreen
              loading="lazy"
            ></iframe>
          </div>
        ) : null}
      </div>
    </div>
  );
}