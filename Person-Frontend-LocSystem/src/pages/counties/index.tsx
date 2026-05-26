import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { dialog } from '../../components/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import {
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
  FormDescription,
} from '../../components/ui/form';
import { useAuth } from '../../components/providers/auth';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { DataTableEmptyState } from '../../components/DataTable/data-table-empty-state';
import Loading from '../../components/ui/Loading';
import CustomAlert from '../../hooks/useCustomAlert';
import { brazilianStates } from '../../lib/brazilian-states';

type UserCounty = {
  i_id: number;
  i_county_id: number;
  b_is_primary: boolean;
  created_at: string;
  county: {
    i_id: number;
    v_name: string;
    v_state: string;
  } | null;
};

type AlertState = {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
};

const countySchema = z.object({
  v_state: z.string().length(2, 'Selecione a UF'),
  v_name: z.string().min(1, 'Nome da comarca e obrigatorio'),
  b_is_primary: z.boolean().default(false),
});

type CountySchema = z.infer<typeof countySchema>;

function CountyForm({ form }: { form: UseFormReturn<CountySchema> }) {
  const selectedState = form.watch('v_state');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const cityListId = useMemo(() => `county-cities-${selectedState || 'empty'}`, [selectedState]);

  useEffect(() => {
    let active = true;

    async function loadCities() {
      if (!selectedState) {
        setCitySuggestions([]);
        return;
      }

      try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios`);
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
  }, [selectedState]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="v_state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UF</FormLabel>
              <FormControl>
                <select
                  value={field.value}
                  onChange={field.onChange}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {brazilianStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.code} - {state.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="v_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comarca</FormLabel>
              <FormControl>
                <>
                  <Input placeholder="Nome da comarca" list={cityListId} {...field} />
                  <datalist id={cityListId}>
                    {citySuggestions.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </>
              </FormControl>
              <FormDescription>Selecione a UF para receber sugestoes de municipios do IBGE.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="b_is_primary"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Definir como comarca principal</FormLabel>
              <FormDescription>Ao marcar esta opcao, a comarca atual substitui a principal existente.</FormDescription>
            </div>
          </FormItem>
        )}
      />
    </>
  );
}

export default function CountiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [alertInfo, setAlertInfo] = useState<AlertState | null>(null);

  const { data: userCounties = [], isLoading } = useQuery<UserCounty[]>({
    queryKey: ['my-counties'],
    queryFn: async () => {
      const response = await api.get('/counties/my');
      return (response.data.userCounties ?? response.data.data ?? []) as UserCounty[];
    },
    enabled: user.role === 'OPERATOR',
  });

  const attachMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post('/counties/attach', payload);
      return response.data;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (countyId: number) => {
      const response = await api.delete(`/counties/my/${countyId}`);
      return response.data;
    },
  });

  const primaryMutation = useMutation({
    mutationFn: async (countyId: number) => {
      const response = await api.patch(`/counties/my/${countyId}/primary`);
      return response.data;
    },
  });

  async function refreshCounties() {
    await queryClient.invalidateQueries({ queryKey: ['my-counties'] });
  }

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
    await dialog.form('Adicionar comarca', {
      description: 'Vincule uma nova comarca ao seu cadastro.',
      schema: countySchema,
      submitText: 'Adicionar comarca',
      defaultValues: {
        v_state: '',
        v_name: '',
        b_is_primary: userCounties.length === 0,
      },
      form: (form) => <CountyForm form={form} />,
      async handler({ form, data }) {
        try {
          const response = await attachMutation.mutateAsync({
            v_state: data.v_state,
            v_name: data.v_name,
            b_is_primary: data.b_is_primary,
          });

          setAlertInfo({ message: response?.success ?? 'Comarca vinculada com sucesso.', type: 'success' });
          await refreshCounties();
          return response;
        } catch (error: any) {
          const errors = error?.response?.data?.errors as Record<string, string[]> | undefined;
          if (errors?.v_state) form.setError('v_state', { message: errors.v_state[0] });
          if (errors?.v_name) form.setError('v_name', { message: errors.v_name[0] });
          if (errors) {
            throw new Error('Falha de validacao');
          }

          setAlertInfo({
            message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao vincular comarca.',
            type: 'error',
          });
          throw new Error('Falha ao vincular comarca');
        }
      },
    });
  }

  async function handleSetPrimary(userCounty: UserCounty) {
    try {
      const response = await primaryMutation.mutateAsync(userCounty.i_county_id);
      setAlertInfo({ message: response?.success ?? 'Comarca principal atualizada com sucesso.', type: 'success' });
      await refreshCounties();
    } catch (error: any) {
      setAlertInfo({
        message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao definir comarca principal.',
        type: 'error',
      });
    }
  }

  async function handleRemove(userCounty: UserCounty) {
    const confirmed = await dialog.confirm('Remover comarca', {
      description: `Deseja remover a comarca ${userCounty.county?.v_name}/${userCounty.county?.v_state}?`,
      actionText: 'Remover',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await removeMutation.mutateAsync(userCounty.i_county_id);
      setAlertInfo({ message: response?.success ?? 'Comarca removida com sucesso.', type: 'success' });
      await refreshCounties();
    } catch (error: any) {
      setAlertInfo({
        message: error?.response?.data?.info ?? error?.response?.data?.error ?? 'Erro ao remover comarca.',
        type: 'error',
      });
    }
  }

  return (
    <>
      {(isLoading || attachMutation.isPending || removeMutation.isPending || primaryMutation.isPending) && <Loading />}
      {alertInfo ? (
        <div className="fixed right-4 top-4 z-[9999]">
          <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />
        </div>
      ) : null}

      <Topbar breadcrumbs={[{ label: 'Comarcas' }]} />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Suas comarcas</h1>
          <p className="text-muted-foreground">Gerencie as comarcas onde voce atua como localizador</p>
        </div>
        <Button variant="primary" onClick={onAdd}>
          <Plus className="mr-2 size-4" />
          Adicionar comarca
        </Button>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Resumo</h2>
              <p className="text-sm text-muted-foreground">
                {userCounties.length} comarca{userCounties.length === 1 ? '' : 's'} vinculada{userCounties.length === 1 ? '' : 's'} ao seu cadastro.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-lg border px-4 py-3 text-sm">
                <div className="text-muted-foreground">Principal</div>
                <div className="mt-1 font-medium">
                  {userCounties.find((item) => item.b_is_primary)?.county?.v_name ?? 'Nao definida'}
                </div>
              </div>
              <div className="rounded-lg border px-4 py-3 text-sm">
                <div className="text-muted-foreground">Total</div>
                <div className="mt-1 font-medium">{userCounties.length}</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {userCounties.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <DataTableEmptyState
                title="Nenhuma comarca vinculada"
                description="Adicione uma comarca para comecar a operar nas buscas por regiao."
                minHeightClassName="min-h-[320px]"
              />
            </div>
          ) : (
            userCounties.map((userCounty) => (
              <Card key={userCounty.i_id} className="flex flex-col justify-between p-6">
                <div>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{userCounty.county?.v_name}</h3>
                      <p className="text-sm text-muted-foreground">{userCounty.county?.v_state}</p>
                    </div>
                    {userCounty.b_is_primary ? <Badge>Principal</Badge> : <Badge variant="outline">Secundaria</Badge>}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Vinculada em {new Date(userCounty.created_at).toLocaleDateString('pt-BR')}</p>
                    <p>ID da comarca: {userCounty.i_county_id}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    variant={userCounty.b_is_primary ? 'outline' : 'secondary'}
                    disabled={userCounty.b_is_primary}
                    onClick={() => handleSetPrimary(userCounty)}
                  >
                    <Star className="mr-2 size-4" />
                    Tornar principal
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleRemove(userCounty)}>
                    <Trash2 className="mr-2 size-4" />
                    Remover
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </>
  );
}
