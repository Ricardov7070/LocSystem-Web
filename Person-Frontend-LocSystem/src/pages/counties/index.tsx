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
import { useAuth } from '../../components/providers/auth';

const countySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
});
type CountySchema = z.infer<typeof countySchema>;

function CountyForm({ form }: { form: UseFormReturn<CountySchema> }) {
  return (
    <FormField control={form.control} name="name" render={({ field }) => (
      <FormItem><FormLabel>Nome da Comarca <span className="text-red-500">*</span></FormLabel>
        <FormControl><Input placeholder="Nome da comarca" {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

export default function CountiesPage() {
  const { user } = useAuth();

  if (user.role !== 'OPERATOR') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground">Apenas operadores podem acessar comarcas.</p>
        </div>
      </div>
    );
  }

  async function onAdd() {
    const response = await dialog.form('Adicionar Comarca', {
      description: 'Preencha o nome da comarca',
      schema: countySchema,
      submitText: 'Adicionar',
      form: (form) => <CountyForm form={form} />,
      async handler({ data }) {
        // TODO: chamar API
        return data;
      },
    });

    if (response) {
      toast.success('Comarca adicionada com sucesso');
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Comarcas' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Suas Comarcas</h1>
          <p className="text-muted-foreground">Gerencie as comarcas onde você atua</p>
        </div>
        <div>
          <Button variant="primary" onClick={onAdd}>
            <Plus className="mr-2 size-4" />
            Adicionar Comarca
          </Button>
        </div>
      </header>

      <main className="container mx-auto mb-10 px-10">
        <div className="overflow-auto rounded-lg border bg-background">
          <div className="sticky top-0 z-10 border-b bg-background">
            <div className="grid grid-cols-[1fr_80px] gap-4 p-4 font-medium text-muted-foreground text-sm">
              <div>Nome</div>
              <div>Ações</div>
            </div>
          </div>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Nenhuma comarca cadastrada
          </div>
        </div>
      </main>
    </>
  );
}
