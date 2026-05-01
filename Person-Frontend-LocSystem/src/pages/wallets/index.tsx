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

const walletSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
});
type WalletSchema = z.infer<typeof walletSchema>;

function WalletForm({ form }: { form: UseFormReturn<WalletSchema> }) {
  return (
    <FormField control={form.control} name="name" render={({ field }) => (
      <FormItem><FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
        <FormControl><Input placeholder="Nome da carteira" {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

export default function WalletsPage() {
  async function onAdd() {
    const response = await dialog.form('Adicionar Carteira', {
      description: 'Informe o nome da carteira',
      schema: walletSchema,
      submitText: 'Adicionar',
      form: (form) => <WalletForm form={form} />,
      async handler({ data }) {
        // TODO: chamar API
        return data;
      },
    });

    if (response) {
      toast.success('Carteira adicionada com sucesso');
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Carteiras' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Carteiras</h1>
          <p className="text-muted-foreground">Gerenciamento de Carteiras</p>
        </div>
        <div>
          <Button variant="primary" onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Carteira
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="overflow-auto rounded-lg border bg-background">
          <div className="sticky top-0 z-10 border-b bg-background">
            <div className="grid grid-cols-[1fr_minmax(120px,1fr)_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
              <div>Nome</div>
              <div>Criado em</div>
              <div>Ações</div>
            </div>
          </div>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Nenhuma carteira cadastrada
          </div>
        </div>
      </main>
    </>
  );
}
