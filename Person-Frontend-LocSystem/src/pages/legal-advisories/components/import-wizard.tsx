import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Download, FileSpreadsheet, MapPin, Play, Upload } from 'lucide-react';

import api from '../../../services/api';
import { Dropzone } from '../../../components/Dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Card } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

type Step = 'upload' | 'mapping' | 'validation' | 'import' | 'report';

type PreviewData = {
  fileName: string;
  totalRows: number;
  headers: string[];
  previewRows: Record<string, unknown>[];
  suggestedMapping: Record<string, string>;
};

type ValidationResult = {
  summary: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
  };
  results: Array<{
    rowNumber: number;
    mappedData: Record<string, unknown>;
    status: 'valid' | 'warning' | 'error';
    errors: string[];
    warnings: string[];
  }>;
  canProceed: boolean;
};

const VALIDATION_STATUS_LABELS = {
  valid: 'Valido',
  warning: 'Aviso',
  error: 'Erro',
} as const;

const VALIDATION_STATUS_STYLES = {
  valid: 'border-green-200 bg-green-50 text-green-700',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  error: 'border-red-200 bg-red-50 text-red-700',
} as const;

const IMPORT_STATUS_LABELS = {
  created: 'Criado',
  updated: 'Substabelecido',
  skipped: 'Pulado',
  error: 'Erro',
} as const;

const IMPORT_STATUS_STYLES = {
  created: 'border-green-200 bg-green-50 text-green-700',
  updated: 'border-blue-200 bg-blue-50 text-blue-700',
  skipped: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  error: 'border-red-200 bg-red-50 text-red-700',
} as const;

type ValidationStatusFilter = 'all' | 'valid' | 'warning' | 'error';

type ImportResult = {
  importId: string;
  summary: {
    totalRows: number;
    successCount: number;
    updateCount: number;
    skippedCount: number;
    errorCount: number;
  };
  results: Array<{
    rowNumber: number;
    status: 'created' | 'updated' | 'skipped' | 'error';
    data: Record<string, unknown>;
    message?: string;
    error?: string;
  }>;
};

type ImportWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  legalAdvisoryId: string;
  onImportComplete?: () => void;
};

const SYSTEM_FIELDS = [
  { value: 'PLACA', label: 'Placa', required: true },
  { value: 'MODELO', label: 'Modelo', required: false },
  { value: 'TELEFONE', label: 'Telefone', required: false },
];

const STEP_META = {
  upload: { title: 'Upload do Arquivo', icon: Upload },
  mapping: { title: 'Mapeamento de Colunas', icon: MapPin },
  validation: { title: 'Validação dos Dados', icon: CheckCircle },
  import: { title: 'Importação', icon: Play },
  report: { title: 'Relatório Final', icon: CheckCircle },
} satisfies Record<Step, { title: string; icon: typeof Upload }>;

function findMissingRequiredFields(mapping: Record<string, string>) {
  return SYSTEM_FIELDS.filter((field) => field.required && !Object.values(mapping).includes(field.value));
}

function isCompatibleHeader(fieldValue: string, header: string) {
  const lower = header.trim().toLowerCase();

  if (fieldValue === 'PLACA') {
    return lower.includes('placa');
  }

  if (fieldValue === 'MODELO') {
    return lower.includes('modelo');
  }

  if (fieldValue === 'TELEFONE') {
    return lower.includes('telefone') || lower.includes('contato');
  }

  return false;
}

function formatMappedData(mappedData: Record<string, unknown>) {
  const entries = Object.entries(mappedData).filter(([, value]) => {
    if (value === null || value === undefined) {
      return false;
    }

    const normalized = String(value).trim();

    return normalized !== '';
  });

  if (entries.length === 0) {
    return '-';
  }

  return entries.map(([key, value]) => `"${key}": "${String(value)}"`).join(' | ');
}

function getPlateDisplayValue(mappedData: Record<string, unknown>) {
  const rawPlate = String(mappedData.PLACA ?? '').trim().toUpperCase();

  return rawPlate || '-';
}

function getPlateModelMeta(mappedData: Record<string, unknown>) {
  const rawPlate = String(mappedData.PLACA ?? '').trim().toUpperCase();
  const normalizedPlate = rawPlate.replace(/[^A-Z0-9]/g, '');

  if (/^[A-Z]{3}[0-9]{4}$/.test(normalizedPlate)) {
    return {
      label: 'Padrão',
      className: 'text-xs font-medium text-zinc-300',
    };
  }

  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(normalizedPlate)) {
    return {
      label: 'Mercosul',
      className: 'text-xs font-medium text-blue-400',
    };
  }

  return null;
}

function SummaryCard({ label, value, valueClassName }: { label: string; value: number; valueClassName?: string }) {
  return (
    <Card className="rounded-xl border bg-card p-4 text-center shadow-sm">
      <p className={`text-3xl font-semibold leading-none ${valueClassName ?? 'text-foreground'}`}>{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}

export function ImportWizard({
  open,
  onOpenChange,
  legalAdvisoryId,
  onImportComplete,
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationStatusFilter, setValidationStatusFilter] = useState<ValidationStatusFilter>('all');
  const [validationPage, setValidationPage] = useState(1);

  function resetWizard() {
    setCurrentStep('upload');
    setFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setValidationResult(null);
    setImportResult(null);
    setUploadError(null);
    setIsProcessing(false);
    setValidationStatusFilter('all');
    setValidationPage(1);
  }

  async function handleFileUpload(files: File[]) {
    const selectedFile = files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadError(null);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await api.post('/vehicle-imports/preview', formData);

      const nextPreview = response.data as PreviewData;
      const nextMapping = nextPreview.suggestedMapping ?? {};
      const missingRequiredFields = findMissingRequiredFields(nextMapping);

      setPreviewData(nextPreview);
      setColumnMapping(nextMapping);

      if (missingRequiredFields.length > 0) {
        setUploadError(`O arquivo nao possui todas as colunas obrigatórias para importação: ${missingRequiredFields.map((field) => field.label).join(', ')}.`);
        setCurrentStep('upload');
        return;
      }

      setCurrentStep('mapping');
    } catch (error: any) {
      setUploadError(error?.response?.data?.info ?? error?.response?.data?.error ?? 'Nao foi possivel ler o arquivo enviado.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleValidation() {
    if (!file || !previewData) return;

    const missingRequiredFields = findMissingRequiredFields(columnMapping);
    if (missingRequiredFields.length > 0) {
      setUploadError(`Mapeie todas as colunas obrigatorias antes de validar: ${missingRequiredFields.map((field) => field.label).join(', ')}.`);
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('columnMapping', JSON.stringify(columnMapping));
      formData.append('legalAdvisoryId', legalAdvisoryId);

      const response = await api.post('/vehicle-imports/validate', formData);
      setValidationResult(response.data);
      setUploadError(null);
      setValidationStatusFilter('all');
      setValidationPage(1);
      setCurrentStep('validation');
    } catch (error: any) {
      setUploadError(error?.response?.data?.info ?? error?.response?.data?.error ?? 'Falha ao validar os dados do arquivo.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleImport() {
    if (!file) return;

    setIsProcessing(true);
    setCurrentStep('import');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('columnMapping', JSON.stringify(columnMapping));
      formData.append('legalAdvisoryId', legalAdvisoryId);
      formData.append('continueWithErrors', '1');

      const response = await api.post('/vehicle-imports/execute', formData);
      setImportResult(response.data);
      setCurrentStep('report');
      onImportComplete?.();
    } finally {
      setIsProcessing(false);
    }
  }

  const steps: Step[] = ['upload', 'mapping', 'validation', 'import', 'report'];
  const currentStepIndex = steps.indexOf(currentStep);
  const missingRequiredFields = useMemo(() => findMissingRequiredFields(columnMapping), [columnMapping]);
  const validationRows = useMemo(() => {
    if (!validationResult) {
      return [];
    }

    if (validationStatusFilter === 'all') {
      return validationResult.results;
    }

    return validationResult.results.filter((item) => item.status === validationStatusFilter);
  }, [validationResult, validationStatusFilter]);
  const validationTotalPages = Math.max(1, Math.ceil(validationRows.length / 20));
  const validationVisibleRows = useMemo(() => {
    const start = (validationPage - 1) * 20;
    return validationRows.slice(start, start + 20);
  }, [validationPage, validationRows]);

  if (validationPage > validationTotalPages) {
    setValidationPage(validationTotalPages);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetWizard();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Importar Veiculos - {STEP_META[currentStep].title}</DialogTitle>
        </DialogHeader>

        <div className="mb-6 flex flex-wrap items-center gap-3 border-b pb-4">
          {steps.map((step, idx) => {
            const Icon = STEP_META[step].icon;
            const isActive = idx <= currentStepIndex;

            return (
              <div key={step} className="flex items-center gap-3 text-sm">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${isActive ? 'border-primary bg-primary text-white' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}>{STEP_META[step].title}</span>
                {idx < steps.length - 1 && <div className="h-px w-6 bg-border" />}
              </div>
            );
          })}
        </div>

        {uploadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {currentStep === 'upload' && (
          <div className="space-y-4">
            <Card className="border-dashed p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-full bg-muted p-2">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Selecione o arquivo de dados</h3>
                  <p className="text-sm text-muted-foreground">Escolha um arquivo Excel (.xlsx, .xls) ou CSV (.csv) com os dados dos veiculos.</p>
                </div>
              </div>

              <Dropzone
                name="vehicle-import"
                onFiles={handleFileUpload}
                disabled={isProcessing}
                accept={{
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  'application/vnd.ms-excel': ['.xls'],
                  'text/csv': ['.csv'],
                }}
                className="min-h-28 justify-center border-border bg-muted/20"
                text={
                  <div className="text-center text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Arraste e solte um arquivo Excel (.xlsx, .xls) ou CSV (.csv) aqui</p>
                    <p>ou clique para selecionar</p>
                  </div>
                }
                draggingText="Solte o arquivo para iniciar a leitura"
              />
            </Card>

            <Card className="p-4">
              <p className="mb-2 text-sm font-medium">Colunas obrigatórias para importação</p>
              <div className="flex flex-wrap gap-2">
                {SYSTEM_FIELDS.filter((field) => field.required).map((field) => (
                  <span key={field.value} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {field.label}
                  </span>
                ))}
              </div>

              <p className="mb-2 mt-4 text-sm font-medium">Colunas opcionais</p>
              <div className="flex flex-wrap gap-2">
                {SYSTEM_FIELDS.filter((field) => !field.required).map((field) => (
                  <span key={field.value} className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-white/15 dark:bg-[#1a1b1f] dark:text-zinc-300">
                    {field.label}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        )}

        {currentStep === 'mapping' && previewData && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{previewData.fileName}</p>
                  <p className="text-sm text-muted-foreground">{previewData.totalRows} linhas encontradas para processar</p>
                </div>
                <span className="rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">{previewData.headers.length} colunas detectadas</span>
              </div>
            </Card>

            {missingRequiredFields.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O arquivo precisa conter e mapear as colunas obrigatorias: {missingRequiredFields.map((field) => field.label).join(', ')}.
                </AlertDescription>
              </Alert>
            )}

            <Card className="p-4">
              <div className="mb-4">
                <p className="text-sm font-medium">Mapeamento de colunas</p>
                <p className="text-sm text-muted-foreground">Confirme qual coluna do arquivo corresponde a cada campo do sistema. Somente Placa e obrigatoria.</p>
              </div>

              <div className="space-y-3">
                {SYSTEM_FIELDS.map((field) => (
                  <div key={field.value} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium">
                      {field.label}
                      {field.required && <span className="ml-1 text-red-500">*</span>}
                      {!field.required && <span className="ml-2 text-xs font-normal text-muted-foreground">(opcional)</span>}
                    </div>
                    <Select
                      value={Object.entries(columnMapping).find(([, value]) => value === field.value)?.[0] ?? '__none__'}
                      onValueChange={(excelColumn) => {
                        const copy = { ...columnMapping };

                        Object.entries(copy).forEach(([key, value]) => {
                          if (value === field.value) {
                            delete copy[key];
                          }
                        });

                        if (excelColumn !== '__none__') {
                          copy[excelColumn] = field.value;
                        }

                        setColumnMapping(copy);
                      }}
                    >
                      <SelectTrigger className="w-60">
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nao mapear</SelectItem>
                        {previewData.headers
                          .filter((header) => isCompatibleHeader(field.value, header))
                          .map((header) => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>Voltar</Button>
              <Button variant="primary" onClick={handleValidation} disabled={missingRequiredFields.length > 0 || isProcessing}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Validar Dados
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'validation' && validationResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SummaryCard label="Total de veiculos" value={validationResult.summary.totalRows} />
              <SummaryCard label="Validos importados" value={validationResult.summary.validRows} valueClassName="text-green-600" />
              <SummaryCard label="Avisos" value={validationResult.summary.warningRows} valueClassName="text-yellow-600" />
              <SummaryCard label="Erros criticos" value={validationResult.summary.errorRows} valueClassName="text-red-600" />
            </div>

            {(validationResult.summary.errorRows > 0 || validationResult.summary.warningRows > 0) && (
              <Card className="rounded-xl border p-3 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  {validationResult.summary.errorRows} linhas contêm erros que precisam ser corrigidos antes da importação. Avisos indicam registros que podem ser importados com tratamento específico.
                </p>
              </Card>
            )}

            {!validationResult.canProceed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Corrija os dados invalidos do arquivo para prosseguir com a importacao.</AlertDescription>
              </Alert>
            )}

            <Card className="overflow-hidden rounded-xl border shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Detalhes da Validacao</p>
                  <p className="text-xs text-muted-foreground">Exibindo {validationRows.length} registro(s) para o filtro selecionado.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant={validationStatusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => { setValidationStatusFilter('all'); setValidationPage(1); }}>
                    Ver todos ({validationResult.summary.totalRows})
                  </Button>
                  <Button variant={validationStatusFilter === 'valid' ? 'default' : 'outline'} size="sm" onClick={() => { setValidationStatusFilter('valid'); setValidationPage(1); }}>
                    Validos ({validationResult.summary.validRows})
                  </Button>
                  <Button variant={validationStatusFilter === 'warning' ? 'default' : 'outline'} size="sm" onClick={() => { setValidationStatusFilter('warning'); setValidationPage(1); }}>
                    Avisos ({validationResult.summary.warningRows})
                  </Button>
                  <Button variant={validationStatusFilter === 'error' ? 'default' : 'outline'} size="sm" onClick={() => { setValidationStatusFilter('error'); setValidationPage(1); }}>
                    Erros ({validationResult.summary.errorRows})
                  </Button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="p-2 text-center">Linha</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Placas</th>
                    <th className="p-2 text-center">Problemas</th>
                  </tr>
                  </thead>
                  <tbody>
                    {validationVisibleRows.map((item) => {
                      const plateModelMeta = getPlateModelMeta(item.mappedData);

                      return (
                      <tr key={item.rowNumber} className="border-b align-top">
                      <td className="p-2 text-center">{item.rowNumber}</td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${VALIDATION_STATUS_STYLES[item.status]}`}>
                          {VALIDATION_STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="max-w-xs p-2 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-sm font-semibold text-foreground">{getPlateDisplayValue(item.mappedData)}</span>
                          {plateModelMeta && (
                            <span className={plateModelMeta.className}>
                              {plateModelMeta.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-md p-2 text-center">{[...item.errors, ...item.warnings].join(' | ') || '-'}</td>
                    </tr>
                    )})}

                    {validationVisibleRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">Nenhum registro encontrado para este filtro.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                <span>Pagina {validationPage} de {validationTotalPages}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setValidationPage((current) => Math.max(1, current - 1))} disabled={validationPage === 1}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setValidationPage((current) => Math.min(validationTotalPages, current + 1))} disabled={validationPage === validationTotalPages}>
                    Proxima
                  </Button>
                </div>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('mapping')}>Voltar</Button>
              <Button variant="primary" onClick={handleImport} disabled={!validationResult.canProceed || isProcessing}>
                <Download className="mr-2 h-4 w-4" />
                Iniciar Importacao
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'import' && (
          <Card className="p-6 text-center">
            <p className="mb-2 text-lg font-semibold">Importando dados...</p>
            <p className="text-sm text-muted-foreground">Aguarde a finalizacao do processamento.</p>
          </Card>
        )}

        {currentStep === 'report' && importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <SummaryCard label="Criados" value={importResult.summary.successCount} valueClassName="text-green-600" />
              <SummaryCard label="Substabelecidos" value={importResult.summary.updateCount} valueClassName="text-blue-600" />
              <SummaryCard label="Pulados" value={importResult.summary.skippedCount} valueClassName="text-yellow-600" />
              <SummaryCard label="Erros" value={importResult.summary.errorCount} valueClassName="text-red-600" />
              <SummaryCard label="Total" value={importResult.summary.totalRows} />
            </div>

            <Card className="overflow-hidden rounded-xl border shadow-sm">
              <div className="border-b bg-muted/20 px-4 py-3">
                <p className="text-sm font-semibold">Resultado da Importacao</p>
              </div>

              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="p-2 text-center">Linha</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-center">Dados</th>
                      <th className="p-2 text-center">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.results.slice(0, 100).map((item) => (
                      <tr key={item.rowNumber} className="border-b align-top">
                        <td className="p-2 text-center">{item.rowNumber}</td>
                        <td className="p-2 text-center">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${IMPORT_STATUS_STYLES[item.status]}`}>
                            {IMPORT_STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td className="max-w-xs p-2 text-center text-muted-foreground">{formatMappedData(item.data)}</td>
                        <td className="max-w-md p-2 text-center">{item.message ?? item.error ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
