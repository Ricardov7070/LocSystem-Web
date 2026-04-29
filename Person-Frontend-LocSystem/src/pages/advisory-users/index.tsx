import { z } from 'zod';
import { Plus } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useState } from 'react';
import { toast } from 'sonner';

import { Topbar } from '../../components/layout/app-topbar';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
} from '../../components/ui/form';
import { DateRangePicker } from '../../components/DateRangePicker';

// ─── Form ────────────────────────────────────────────────────────────────────
const advisoryUserFormSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação obrigatória'),
    legalAdvisoryIds: z.array(z.string()).min(1, 'Selecione ao menos uma assessoria'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });
type AdvisoryUserFormSchema = z.infer<typeof advisoryUserFormSchema>;

function AdvisoryUserForm({ form }: { form: UseFormReturn<AdvisoryUserFormSchema> }) {
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
      <FormField control={form.control} name="phone" render={({ field }) => (
        <FormItem><FormLabel>Telefone <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
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
      <FormField control={form.control} name="legalAdvisoryIds" render={() => (
        <FormItem>
          <FormLabel>Assessorias Jurídicas <span className="text-red-500">*</span></FormLabel>
          <FormControl>
            <Input placeholder="IDs das assessorias (separados por vírgula)" onChange={(e) => {
              form.setValue('legalAdvisoryIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean));
            }} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function AdvisoryUsersTable() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Pesquisar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <DateRangePicker placeholder="Selecione as datas" triggerSize="sm" triggerClassName="w-56 sm:w-60" align="end" />
      </div>

      <div className="overflow-auto rounded-lg border bg-background" style={{ height: '600px' }}>
        <div className="sticky top-0 z-10 border-b bg-background">
          <div className="grid grid-cols-[minmax(200px,3fr)_minmax(200px,3fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(80px,80px)] gap-4 p-4 font-medium text-muted-foreground text-sm">
            <div>Nome</div>
            <div>E-mail</div>
            <div>Assessorias</div>
            <div>Cadastrado em</div>
            <div></div>
          </div>
        </div>
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Nenhum usuário de assessoria cadastrado
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdvisoryUsersPage() {
  async function onAdd() {
    const response = await dialog.form('Adicionar Usuário de Assessoria', {
      description: 'Preencha os dados do usuário',
      schema: advisoryUserFormSchema,
      submitText: 'Adicionar Usuário',
      form: (form) => <AdvisoryUserForm form={form} />,
      async handler({ data }) {
        // TODO: chamar API
        return data;
      },
    });

    if (response) {
      toast.success('Usuário de assessoria adicionado com sucesso');
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Usuários de Assessoria' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Usuários de Assessoria</h1>
          <p className="text-muted-foreground">
            Gerenciamento de Usuários com Acesso a Assessorias Jurídicas
          </p>
        </div>
        <div>
          <Button onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Usuário
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <AdvisoryUsersTable />
      </main>
    </>
  );
}
