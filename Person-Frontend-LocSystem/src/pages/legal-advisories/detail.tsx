import { endOfDay, format, startOfDay } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Ellipsis, Pencil, Trash2, Upload } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { Card } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { DateRangePicker } from '../../components/DateRangePicker';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { dialog } from '../../components/dialog';
import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../../components/ui/Loading';
import { ImportWizard } from './components/import-wizard';
import { z } from 'zod';
import { UseFormReturn } from 'react-hook-form';
import { formatCpfCnpj, formatPhone, stripNonDigits } from '../../lib/utils';

type Wallet = {
  i_id: number;
  v_name: string;
};

type LegalAdvisory = {
  i_id: number;
  v_name: string;
  v_document: string;
  v_phone: string;
  wallet?: Wallet | null;
};

type VehicleImport = {
  i_id: number;
  v_file_path: string;
  e_status: string;
  created_at: string;
};

const IMPORTS_PAGE_SIZE = 10;
const IMPORTS_COLS = 'grid-cols-[minmax(260px,1fr)_minmax(150px,150px)_minmax(160px,160px)_80px]';

const legalAdvisorySchema = z.object({
  v_name: z.string().trim().min(1, 'Nome e obrigatorio').min(4, 'Nome deve ter no minimo 4 caracteres'),
  v_document: z.string().trim().min(1, 'Documento e obrigatorio').refine((value) => {
    const digits = stripNonDigits(value);
    return digits.length === 11 || digits.length === 14;
  }, 'Documento invalido'),
  v_phone: z.string().trim().min(1, 'Telefone e obrigatorio').refine((value) => {
    const digits = stripNonDigits(value);
    return digits.length === 10 || digits.length === 11;
  }, 'Telefone invalido'),
  i_wallet_id: z.string().min(1, 'Carteira e obrigatoria'),
});

type LegalAdvisoryFormSchema = z.infer<typeof legalAdvisorySchema>;

function ImportSortIcon({ colKey, sortKey, sortDir }: { colKey: string; sortKey: string | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== colKey) return <ArrowUpDown className="size-3.5 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

function formatImportDateTime(value: string | null | undefined) {
  if (!value) return '-';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return format(parsedDate, 'dd/MM/yyyy HH:mm');
}

function LegalAdvisoryForm({
  form,
  wallets,
}: {
  form: UseFormReturn<LegalAdvisoryFormSchema>;
  wallets: Wallet[];
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="v_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="Nome da assessoria" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="v_document"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Documento (CPF/CNPJ) <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
                {...field}
                onChange={(event) => field.onChange(formatCpfCnpj(event.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="v_phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefone <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                type="tel"
                placeholder="(00) 00000-0000"
                maxLength={15}
                {...field}
                onChange={(event) => field.onChange(formatPhone(event.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="i_wallet_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Carteira <span className="text-red-500">*</span></FormLabel>
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma carteira" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.i_id} value={String(wallet.i_id)}>{wallet.v_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export default function LegalAdvisoryDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [importsPage, setImportsPage] = useState(1);
  const [importsSortKey, setImportsSortKey] = useState<string | null>('created_at');
  const [importsSortDir, setImportsSortDir] = useState<'asc' | 'desc'>('desc');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const advisoryId = Number(id);

  const { data: legalAdvisory, isLoading } = useQuery<LegalAdvisory>({
    queryKey: ['legal-advisory', advisoryId],
    queryFn: async () => {
      const response = await api.get(`/singleLegalAdvisory/${advisoryId}`);
      return (response.data.legalAdvisory ?? response.data) as LegalAdvisory;
    },
    enabled: Number.isFinite(advisoryId),
  });

  const { data: wallets } = useQuery<Wallet[]>({
    queryKey: ['wallets-options'],
    queryFn: async () => {
      const response = await api.get('/wallets');
      return (response.data.wallet ?? response.data.wallets ?? []) as Wallet[];
    },
  });

  const { data: imports, refetch: refetchImports } = useQuery<VehicleImport[]>({
    queryKey: ['legal-advisory-imports', advisoryId],
    queryFn: async () => {
      const response = await api.get(`/legalAdvisories/${advisoryId}/vehicle-imports`);
      return (response.data.vehicleImport ?? response.data.data ?? []) as VehicleImport[];
    },
    enabled: Number.isFinite(advisoryId),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ idRecord, data }: { idRecord: number; data: Record<string, unknown> }) => {
      const response = await api.put(`/updateLegalAdvisory/${idRecord}`, data);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (idRecord: number) => {
      const response = await api.delete(`/deleteLegalAdvisory/${idRecord}`);
      return response.data;
    },
  });

  const deleteImportMutation = useMutation({
    mutationFn: async (idImport: number) => {
      const response = await api.delete(`/vehicle-imports/${idImport}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (!id || Number.isNaN(advisoryId)) {
      navigate('/legal-advisories', { replace: true });
    }
  }, [id, advisoryId, navigate]);

  function handleImportsSort(key: string) {
    if (importsSortKey === key) {
      setImportsSortDir((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setImportsSortKey(key);
    setImportsSortDir('asc');
  }

  const filteredImports = useMemo(() => {
    const term = search.toLowerCase();
    return (imports ?? []).filter((item) => {
      const fileName = item.v_file_path.split('/').pop() ?? item.v_file_path;
      const matchesSearch = [
        fileName,
        item.e_status,
        formatImportDateTime(item.created_at),
      ].some((field) => field.toLowerCase().includes(term));

      if (!matchesSearch) return false;
      if (!dateRange?.from || !dateRange?.to) return true;

      const createdAt = new Date(item.created_at);
      if (Number.isNaN(createdAt.getTime())) return false;

      return createdAt >= startOfDay(dateRange.from) && createdAt <= endOfDay(dateRange.to);
    });
  }, [dateRange, imports, search]);

  const sortedImports = useMemo(() => {
    if (!importsSortKey) return filteredImports;

    return [...filteredImports].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (importsSortKey) {
        case 'file': {
          aValue = decodeURI(a.v_file_path.split('/').pop() ?? a.v_file_path);
          bValue = decodeURI(b.v_file_path.split('/').pop() ?? b.v_file_path);
          break;
        }
        case 'status': {
          aValue = a.e_status ?? '';
          bValue = b.e_status ?? '';
          break;
        }
        case 'created_at': {
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        }
        default:
          return 0;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return importsSortDir === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return importsSortDir === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [filteredImports, importsSortDir, importsSortKey]);

  const importsTotalPages = Math.max(1, Math.ceil(sortedImports.length / IMPORTS_PAGE_SIZE));
  const paginatedImports = sortedImports.slice((importsPage - 1) * IMPORTS_PAGE_SIZE, importsPage * IMPORTS_PAGE_SIZE);

  useEffect(() => {
    setImportsPage(1);
  }, [dateRange, search, importsSortDir, importsSortKey]);

  async function refreshLegalAdvisory() {
    await queryClient.invalidateQueries({ queryKey: ['legal-advisory', advisoryId] });
    await queryClient.refetchQueries({ queryKey: ['legal-advisory', advisoryId], type: 'active' });
    await queryClient.invalidateQueries({ queryKey: ['legal-advisories'] });
  }

  async function handleEdit() {
    if (!legalAdvisory) return;

    await dialog.form('Editar assessoria', {
      description: 'Atualize os dados da assessoria',
      schema: legalAdvisorySchema,
      submitText: 'Salvar alterações',
      defaultValues: {
        v_name: legalAdvisory.v_name,
        v_document: formatCpfCnpj(legalAdvisory.v_document),
        v_phone: formatPhone(legalAdvisory.v_phone),
        i_wallet_id: legalAdvisory.wallet?.i_id ? String(legalAdvisory.wallet.i_id) : '',
      },
      form: (form) => <LegalAdvisoryForm form={form} wallets={wallets ?? []} />,
      async handler({ form, data }) {
        try {
          const payload = {
            ...data,
            v_document: stripNonDigits(data.v_document),
            v_phone: stripNonDigits(data.v_phone),
            i_wallet_id: Number(data.i_wallet_id),
          };

          const response = await updateMutation.mutateAsync({ idRecord: advisoryId, data: payload });
          await refreshLegalAdvisory();
          setAlertInfo({ message: response?.success ?? 'Assessoria atualizada com sucesso', type: 'success' });
          return response;
        } catch (err: any) {
          const errors = err?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors) {
            Object.entries(errors).forEach(([field, msgs]) => {
              form.setError(field as keyof LegalAdvisoryFormSchema, { message: msgs[0] });
            });
            throw new Error('Falha de validacao');
          }
          setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao atualizar assessoria.', type: 'error' });
          throw new Error('Falha ao atualizar assessoria');
        }
      },
    });
  }

  async function handleDelete() {
    if (!legalAdvisory) return;

    const confirmed = await dialog.confirm('Excluir assessoria', {
      description: `Deseja remover a assessoria ${legalAdvisory.v_name}?`,
      actionText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteMutation.mutateAsync(advisoryId);
      setAlertInfo({ message: response?.success ?? 'Assessoria removida com sucesso', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['legal-advisories'] });
      queryClient.removeQueries({ queryKey: ['legal-advisory', advisoryId] });
      navigate('/legal-advisories', { replace: true });
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao excluir assessoria.', type: 'error' });
    }
  }

  async function handleDeleteImport(item: VehicleImport) {
    const confirmed = await dialog.confirm('Remover importação', {
      description: 'Deseja remover a importação selecionada? Essa ação remove os veículos vinculados a essa importação.',
      actionText: 'Remover',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await deleteImportMutation.mutateAsync(item.i_id);
      setAlertInfo({ message: response?.success ?? 'Importação removida com sucesso', type: 'success' });
      refetchImports();
      queryClient.invalidateQueries({ queryKey: ['legal-advisories'] });
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.info ?? err?.response?.data?.error ?? 'Erro ao remover importação.', type: 'error' });
    }
  }

  return (
    <>
      {(isLoading || updateMutation.isPending || deleteMutation.isPending || deleteImportMutation.isPending) && <Loading />}
      {alertInfo && (
        <div className="fixed right-4 top-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      )}

      <Topbar
        breadcrumbs={[
          { label: 'Assessorias Juridicas', href: '/legal-advisories' },
          { label: legalAdvisory?.v_name ?? 'Detalhes' },
        ]}
      />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">{legalAdvisory?.v_name ?? 'Assessoria Juridica'}</h1>
          <p className="text-muted-foreground">Detalhes da assessoria juridica</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setShowImportWizard(true)}>
            <Upload className="mr-2 size-4" />
            Nova Importação
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="mr-2 size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-500 hover:text-red-500 focus:text-red-500" onClick={handleDelete}>
                <Trash2 className="mr-2 size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Informações da Assessoria</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {[
                { label: 'Nome', value: legalAdvisory?.v_name ?? '-' },
                { label: 'Documento', value: legalAdvisory?.v_document ? formatCpfCnpj(legalAdvisory.v_document) : '-' },
                { label: 'Telefone', value: legalAdvisory?.v_phone ? formatPhone(legalAdvisory.v_phone) : '-' },
                { label: 'Carteira', value: legalAdvisory?.wallet?.v_name ?? 'Nao definida' },
              ].map((row, index, array) => (
                <div key={row.label}>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">{row.label}</span>
                    <span className="text-sm">{row.value}</span>
                  </div>
                  {index < array.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Histórico de Importações</h2>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Input placeholder="Pesquisar por arquivo..." className="w-64" value={search} onChange={(event) => setSearch(event.target.value)} />
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Filtrar por Criado em"
              triggerSize="sm"
              triggerClassName="w-56 sm:w-60"
              align="end"
            />
          </div>

          <div className="overflow-auto rounded-lg border bg-background">
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className={`grid ${IMPORTS_COLS} gap-4 p-4 text-sm font-medium text-muted-foreground`}>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleImportsSort('file')}>
                  Arquivo <ImportSortIcon colKey="file" sortKey={importsSortKey} sortDir={importsSortDir} />
                </button>
                <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleImportsSort('status')}>
                  Status <ImportSortIcon colKey="status" sortKey={importsSortKey} sortDir={importsSortDir} />
                </button>
                <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleImportsSort('created_at')}>
                  Criado em <ImportSortIcon colKey="created_at" sortKey={importsSortKey} sortDir={importsSortDir} />
                </button>
                <div className="text-center">Ações</div>
              </div>
            </div>

            {sortedImports.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                Nenhuma importação encontrada
              </div>
            ) : (
              <div className="divide-y">
                {paginatedImports.map((item) => {
                  const fileName = item.v_file_path.split('/').pop() ?? item.v_file_path;
                  return (
                    <div key={item.i_id} className={`grid ${IMPORTS_COLS} items-center gap-4 p-4 text-sm`}>
                      <a href={item.v_file_path} target="_blank" rel="noreferrer" className="truncate hover:text-primary hover:underline">
                        {decodeURI(fileName)}
                      </a>
                      <div className="text-center">
                        <span className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {item.e_status}
                        </span>
                      </div>
                      <div className="text-center text-muted-foreground">{formatImportDateTime(item.created_at)}</div>
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Ellipsis className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => handleDeleteImport(item)}>
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
            )}
          </div>

          {sortedImports.length > IMPORTS_PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {Math.min((importsPage - 1) * IMPORTS_PAGE_SIZE + 1, sortedImports.length)}-{Math.min(importsPage * IMPORTS_PAGE_SIZE, sortedImports.length)} de {sortedImports.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setImportsPage((prev) => Math.max(1, prev - 1))} disabled={importsPage === 1}>
                  Anterior
                </Button>
                <span>{importsPage} / {importsTotalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setImportsPage((prev) => Math.min(importsTotalPages, prev + 1))} disabled={importsPage === importsTotalPages}>
                  Proxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {legalAdvisory && (
        <ImportWizard
          open={showImportWizard}
          onOpenChange={setShowImportWizard}
          legalAdvisoryId={String(legalAdvisory.i_id)}
          onImportComplete={() => {
            refetchImports();
            queryClient.invalidateQueries({ queryKey: ['legal-advisories'] });
            setAlertInfo({ message: 'Importação concluída com sucesso.', type: 'success' });
          }}
        />
      )}
    </>
  );
}
