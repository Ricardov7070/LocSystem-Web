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

const pricingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  operatorPrice: z.string().min(1, 'Valor do localizador é obrigatório'),
  prepostoPrice: z.string().min(1, 'Valor do preposto é obrigatório'),
});
type PricingSchema = z.infer<typeof pricingSchema>;

function PricingForm({ form }: { form: UseFormReturn<PricingSchema> }) {
  return (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem><FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
          <FormControl><Input placeholder="Nome do plano" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="operatorPrice" render={({ field }) => (
          <FormItem><FormLabel>Valor Localizador <span className="text-red-500">*</span></FormLabel>
            <FormControl><Input placeholder="R$ 0,00" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="prepostoPrice" render={({ field }) => (
          <FormItem><FormLabel>Valor Preposto <span className="text-red-500">*</span></FormLabel>
            <FormControl><Input placeholder="R$ 0,00" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </>
  );
}

export default function PricingPage() {
  async function onAdd() {
    const response = await dialog.form('Adicionar Plano', {
      description: 'Preencha os dados do plano de preços',
      schema: pricingSchema,
      submitText: 'Adicionar Plano',
      form: (form) => <PricingForm form={form} />,
      async handler({ data }) {
        // TODO: chamar API
        return data;
      },
    });

    if (response) {
      toast.success('Plano adicionado com sucesso');
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Planos' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Planos</h1>
          <p className="text-muted-foreground">Gerenciamento de Planos e Preços</p>
        </div>
        <div>
          <Button onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Plano
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="overflow-auto rounded-lg border bg-background">
          <div className="sticky top-0 z-10 border-b bg-background">
            <div className="grid grid-cols-[minmax(180px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(100px,1fr)_minmax(120px,1fr)_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
              <div>Nome</div>
              <div>Valor Localizador</div>
              <div>Valor Preposto</div>
              <div>Status</div>
              <div>Criado em</div>
              <div>Ações</div>
            </div>
          </div>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Nenhum plano cadastrado
          </div>
        </div>
      </main>
    </>
  );
}
