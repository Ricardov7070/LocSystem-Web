import { z } from 'zod';
import { Plus } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
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

const legalAdvisorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  document: z.string().min(11, 'CPF/CNPJ inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  walletId: z.string().optional(),
});
type LegalAdvisoryFormSchema = z.infer<typeof legalAdvisorySchema>;

function LegalAdvisoryForm({ form }: { form: UseFormReturn<LegalAdvisoryFormSchema> }) {
  return (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem><FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="Nome da assessoria" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="document" render={({ field }) => (
        <FormItem><FormLabel>Documento (CPF/CNPJ) <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="000.000.000-00 ou 00.000.000/0000-00" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="phone" render={({ field }) => (
        <FormItem><FormLabel>Telefone <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="walletId" render={({ field }) => (
        <FormItem><FormLabel>Carteira</FormLabel>
          <FormControl><Input placeholder="ID da carteira" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}

export default function LegalAdvisoriesPage() {
  async function onAdd() {
    const response = await dialog.form('Adicionar Assessoria', {
      description: 'Preencha os dados da assessoria jurídica',
      schema: legalAdvisorySchema,
      submitText: 'Adicionar Assessoria',
      form: (form) => <LegalAdvisoryForm form={form} />,
      async handler({ data }) {
        // TODO: chamar API
        return data;
      },
    });

    if (response) {
      toast.success('Assessoria adicionada com sucesso');
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Assessorias Jurídicas' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Assessorias Jurídicas</h1>
          <p className="text-muted-foreground">Gerenciamento de Assessorias Jurídicas</p>
        </div>
        <div>
          <Button onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Assessoria
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input placeholder="Pesquisar por nome..." className="w-64" />
            <DateRangePicker placeholder="Selecione as datas" triggerSize="sm" triggerClassName="w-56 sm:w-60" align="end" />
          </div>

          <div className="overflow-auto rounded-lg border bg-background" style={{ height: '600px' }}>
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className="grid grid-cols-[minmax(200px,3fr)_minmax(150px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
                <div>Nome</div>
                <div>Documento</div>
                <div>Telefone</div>
                <div>Carteira</div>
                <div>Status de Update</div>
                <div>Criado em</div>
                <div></div>
              </div>
            </div>
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Nenhuma assessoria jurídica cadastrada
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
