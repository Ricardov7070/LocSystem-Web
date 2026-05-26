import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Search } from 'lucide-react';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Card } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useAuth } from '../../components/providers/auth';
import Loading from '../../components/ui/Loading';
import CustomAlert from '../../hooks/useCustomAlert';
import { Badge } from '../../components/ui/badge';
import { brazilianStates } from '../../lib/brazilian-states';
import { formatPhone } from '../../lib/utils';

type SearchResult = {
  isPrimary: boolean;
  user: {
    i_id: number;
    v_name: string;
    v_email: string;
    v_phone: string | null;
    b_banned: boolean;
  };
  county: {
    i_id: number;
    v_name: string;
    v_state: string;
  };
};

type AlertState = {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
};

type SubmittedFilters = {
  countyName: string;
  state: string;
  search: string;
};

function getSearchErrorMessage(error: unknown): string {
  return (error as any)?.response?.data?.info
    ?? (error as any)?.response?.data?.error
    ?? 'Erro ao buscar localizadores por comarca.';
}

export default function SearchByCountyPage() {
  const { user } = useAuth();
  const [countyName, setCountyName] = useState('');
  const [state, setState] = useState('');
  const [search, setSearch] = useState('');
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [alertInfo, setAlertInfo] = useState<AlertState | null>(null);
  const cityListId = useMemo(() => `search-county-${state || 'empty'}`, [state]);

  useEffect(() => {
    let active = true;

    async function loadCities() {
      if (!state) {
        setCitySuggestions([]);
        return;
      }

      try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios`);
        const data = (await response.json()) as Array<{ nome: string }>;
        if (!active) return;
        setCitySuggestions(data.map((item) => item.nome));
      } catch {
        if (!active) return;
        setCitySuggestions([]);
      }
    }

    loadCities();
    return () => {
      active = false;
    };
  }, [state]);

  const { data: results = [], isFetching, isError, error, refetch } = useQuery<SearchResult[]>({
    queryKey: ['search-by-county', submittedFilters],
    enabled: Boolean(submittedFilters),
    queryFn: async () => {
      const response = await api.get('/counties/search/operators', {
        params: {
          countyName: submittedFilters?.countyName || undefined,
          state: submittedFilters?.state || undefined,
          search: submittedFilters?.search || undefined,
        },
      });

      return (response.data.operators ?? response.data.data ?? []) as SearchResult[];
    },
    throwOnError: false,
    retry: false,
  });

  useEffect(() => {
    setAlertInfo(null);
  }, [submittedFilters]);

  useEffect(() => {
    if (!isError) return;

    setAlertInfo({
      message: getSearchErrorMessage(error),
      type: 'error',
    });
  }, [isError, error]);

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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!countyName.trim() && !search.trim()) {
      setAlertInfo({
        message: 'Informe ao menos a comarca ou um termo de busca para pesquisar.',
        type: 'warning',
      });
      return;
    }

    setSubmittedFilters({
      countyName: countyName.trim(),
      state,
      search: search.trim(),
    });
  }

  return (
    <>
      {isFetching ? <Loading /> : null}
      {alertInfo ? (
        <div className="fixed right-4 top-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      ) : null}

      <Topbar breadcrumbs={[{ label: 'Busca por Comarca' }]} />

      <header className="container mx-auto mb-3 px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Busca por comarca</h1>
          <p className="text-muted-foreground">
            Encontre localizadores vinculados a uma comarca especifica e consulte seus dados de contato.
          </p>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        <Card className="p-6">
          <form onSubmit={handleSearch} className="grid gap-4 lg:grid-cols-[180px_minmax(260px,1fr)_minmax(260px,1fr)_140px]">
            <div className="space-y-1">
              <label className="text-sm font-medium">UF</label>
              <Select value={state || 'ALL'} onValueChange={(value) => setState(value === 'ALL' ? '' : value)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {brazilianStates.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.code} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Comarca</label>
              <>
                <Input
                  placeholder="Nome da comarca"
                  value={countyName}
                  list={cityListId}
                  onChange={(event) => setCountyName(event.target.value)}
                />
                <datalist id={cityListId}>
                  {citySuggestions.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Nome, e-mail ou telefone</label>
              <Input
                placeholder="Filtrar localizador"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <span className="invisible block text-sm font-medium select-none">Buscar</span>
              <Button type="submit" variant="primary" className="w-full">
                <Search className="size-4" />
                Buscar
              </Button>
            </div>
          </form>
        </Card>

        {submittedFilters ? (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Resultados da busca</h2>
                <p className="text-sm text-muted-foreground">
                  {results.length} resultado{results.length === 1 ? '' : 's'} encontrado{results.length === 1 ? '' : 's'}.
                </p>
              </div>
            </div>

            <div className="overflow-auto rounded-lg border bg-background">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[minmax(220px,2fr)_minmax(240px,2fr)_minmax(120px,1fr)_minmax(200px,1.5fr)_120px_100px] gap-4 border-b p-4 text-sm font-medium text-muted-foreground">
                  <div>Operador</div>
                  <div>Comarca</div>
                  <div>UF</div>
                  <div>Contato</div>
                  <div>Status</div>
                  <div>Detalhes</div>
                </div>

                {isError ? (
                  <div className="p-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Falha ao carregar resultados</AlertTitle>
                      <AlertDescription>
                        <div className="space-y-3">
                          <p>{getSearchErrorMessage(error)}</p>
                          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                            Tentar novamente
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : results.length === 0 ? (
                  <DataTableEmptyState
                    title="Nenhum operador encontrado"
                    description="Nao ha localizadores vinculados aos filtros informados."
                    minHeightClassName="min-h-[320px]"
                  />
                ) : (
                  <div className="divide-y">
                    {results.map((item) => (
                      <div key={`${item.user.i_id}-${item.county.i_id}-${item.isPrimary ? 'p' : 's'}`} className="grid grid-cols-[minmax(220px,2fr)_minmax(240px,2fr)_minmax(120px,1fr)_minmax(200px,1.5fr)_120px_100px] items-center gap-4 p-4 text-sm">
                        <div>
                          <div className="font-medium">{item.user.v_name}</div>
                          <div className="text-xs text-muted-foreground">{item.user.v_email}</div>
                        </div>

                        <div>
                          <div className="font-medium">{item.county.v_name}</div>
                          {item.isPrimary ? <Badge variant="outline" className="mt-1">Principal</Badge> : null}
                        </div>

                        <div className="text-muted-foreground">{item.county.v_state}</div>
                        <div className="text-muted-foreground">{formatPhone(item.user.v_phone ?? '') || '-'}</div>
                        <div>
                          <Badge variant={item.user.b_banned ? 'destructive' : 'secondary'}>
                            {item.user.b_banned ? 'Bloqueado' : 'Ativo'}
                          </Badge>
                        </div>
                        <div>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/users/operators/${item.user.i_id}`}>Abrir</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
