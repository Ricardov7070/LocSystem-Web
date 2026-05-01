import { z } from 'zod';
import { Plus, ArrowUpDown } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useState } from 'react';
import { toast } from 'sonner';

import { Topbar } from '../../components/layout/app-topbar';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
  FormDescription,
} from '../../components/ui/form';
import { DateRangePicker } from '../../components/DateRangePicker';

// ─── Form ────────────────────────────────────────────────────────────────────
const operatorFormSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    document: z.string().min(14, 'CNPJ inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação obrigatória'),
    userLimit: z.number().min(0).default(0),
    isCourtesy: z.boolean().default(false),
    pricingPlanId: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });
type OperatorFormSchema = z.infer<typeof operatorFormSchema>;

function OperatorForm({ form }: { form: UseFormReturn<OperatorFormSchema> }) {
  const isCourtesy = form.watch('isCourtesy');

  return (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem><FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="email" render={({ field }) => (
        <FormItem><FormLabel>E-mail <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="document" render={({ field }) => (
          <FormItem><FormLabel>CNPJ <span className="text-red-500">*</span></FormLabel>
            <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem><FormLabel>Telefone <span className="text-red-500">*</span></FormLabel>
            <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Senha <span className="text-red-500">*</span></FormLabel>
            <FormControl><Input type="password" placeholder="Senha" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem><FormLabel>Confirmar senha <span className="text-red-500">*</span></FormLabel>
            <FormControl><Input type="password" placeholder="Confirmar senha" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <FormField control={form.control} name="isCourtesy" render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Acesso Cortesia</FormLabel>
            <FormDescription>Localizador com acesso gratuito (não paga mensalidade)</FormDescription>
          </div>
        </FormItem>
      )} />

      {!isCourtesy && (
        <FormField control={form.control} name="pricingPlanId" render={({ field }) => (
          <FormItem>
            <FormLabel>Plano de Precificação <span className="text-red-500">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="placeholder">Nenhum plano disponível</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      )}

      <FormField control={form.control} name="userLimit" render={({ field }) => (
        <FormItem>
          <FormLabel>Limite de Prepostos</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              placeholder="0"
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          </FormControl>
          <FormDescription>Número máximo de prepostos permitidos</FormDescription>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function OperatorsTable() {
  const [search, setSearch] = useState('');
  const [accessType, setAccessType] = useState('all');
  const [subscriptionStatus, setSubscriptionStatus] = useState('all');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Pesquisar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />

          <Select value={accessType} onValueChange={setAccessType}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[14rem]">
              <SelectValue placeholder="Tipo de acesso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos de acesso</SelectItem>
              <SelectItem value="monthly">Mensalista</SelectItem>
              <SelectItem value="courtesy">Cortesia</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={subscriptionStatus}
            onValueChange={setSubscriptionStatus}
            disabled={accessType === 'courtesy'}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[14rem]">
              <SelectValue placeholder="Status da assinatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="past_due">Expirada</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DateRangePicker
          placeholder="Selecione as datas"
          triggerSize="sm"
          triggerClassName="w-56 sm:w-60"
          align="end"
        />
      </div>

      <div className="overflow-auto rounded-lg border bg-background" style={{ height: '600px' }}>
        <div className="sticky top-0 z-10 border-b bg-background">
          <div className="grid grid-cols-[minmax(250px,3fr)_minmax(140px,1.5fr)_minmax(120px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(120px,1fr)_minmax(140px,1.5fr)_minmax(140px,1.5fr)] gap-4 p-4 font-medium text-muted-foreground text-sm">
            <div>Nome</div>
            <div>Status</div>
            <div>Tipo de Acesso</div>
            <div>Prepostos</div>
            <div>Qtd Placas</div>
            <div>Plano</div>
            <div>Valor</div>
            <div>
              <Button variant="ghost" size="sm" className="-ml-3 h-8 text-base font-medium text-muted-foreground hover:text-foreground">
                Data <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Nenhum localizador cadastrado
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OperatorsPage() {
  async function onAdd() {
    const response = await dialog.form('Adicionar Localizador', {
      description: 'Preencha os dados do localizador',
      schema: operatorFormSchema,
      submitText: 'Adicionar Localizador',
      form: (form) => <OperatorForm form={form} />,
      async handler({ data }) {
        // TODO: chamar API
        return data;
      },
    });

    if (response) {
      toast.success(`Localizador adicionado com sucesso`);
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Localizadores' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Localizadores</h1>
          <p className="text-muted-foreground">
            Gerenciamento de Localizadores e Prepostos
          </p>
        </div>
        <div>
          <Button variant="primary" onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Localizador
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <OperatorsTable />
      </main>
    </>
  );
}
