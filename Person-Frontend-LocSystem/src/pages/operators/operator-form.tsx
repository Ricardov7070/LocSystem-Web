import { z } from 'zod';
import { UseFormReturn } from 'react-hook-form';

import { Checkbox } from '../../components/ui/checkbox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatCpfCnpj, formatPhone, stripNonDigits } from '../../lib/utils';

export type PricingPlanOption = {
  i_id: number;
  v_name: string;
  f_operator_price: number | string;
  f_preposto_price: number | string;
  b_is_active: boolean;
};

const operatorBaseShape = {
  v_name: z.string().trim().min(1, 'Nome e obrigatorio').max(100, 'Nome deve ter no maximo 100 caracteres'),
  v_email: z.string().trim().min(1, 'E-mail e obrigatorio').max(50, 'E-mail deve ter no maximo 50 caracteres').email('E-mail invalido'),
  v_document: z.string().refine((value) => stripNonDigits(value).length === 14, 'CNPJ invalido'),
  v_phone: z.string().max(15, 'Telefone deve ter no maximo 15 caracteres').refine((value) => {
    const digits = stripNonDigits(value);
    return digits.length === 10 || digits.length === 11;
  }, 'Telefone invalido'),
  i_user_limit: z.coerce.number().min(0, 'O limite deve ser maior ou igual a zero').default(0),
  b_is_courtesy: z.boolean().default(false),
  i_pricing_plan_id: z.string().optional(),
};

export const operatorFormSchema = z
  .object({
    ...operatorBaseShape,
    v_password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.v_password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  })
  .refine((data) => data.b_is_courtesy || Boolean(data.i_pricing_plan_id), {
    message: 'Plano de precificacao e obrigatorio para mensalistas',
    path: ['i_pricing_plan_id'],
  });

export const operatorEditSchema = z
  .object(operatorBaseShape)
  .refine((data) => data.b_is_courtesy || Boolean(data.i_pricing_plan_id), {
    message: 'Plano de precificacao e obrigatorio para mensalistas',
    path: ['i_pricing_plan_id'],
  });

export const operatorRenewSchema = z.object({
  d_subscription_expires_at: z.string().min(1, 'A data de vencimento e obrigatoria'),
  i_pricing_plan_id: z.string().optional(),
});

export const operatorPasswordSchema = z
  .object({
    v_password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.v_password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });

export type OperatorFormValues = z.infer<typeof operatorFormSchema>;
export type OperatorEditValues = z.infer<typeof operatorEditSchema>;
export type OperatorRenewValues = z.infer<typeof operatorRenewSchema>;
export type OperatorPasswordValues = z.infer<typeof operatorPasswordSchema>;

type OperatorFormProps = {
  form: UseFormReturn<any>;
  pricingPlans: PricingPlanOption[];
  isEdit?: boolean;
};

function limitName(value: string) {
  return value.slice(0, 100);
}

function limitEmail(value: string) {
  return value.slice(0, 50);
}

function normalizePhone(value: string) {
  return formatPhone(stripNonDigits(value).slice(0, 11));
}

function formatCurrency(value: number | string) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) {
    return 'R$ 0,00';
  }

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function OperatorForm({ form, pricingPlans, isEdit = false }: OperatorFormProps) {
  const isCourtesy = form.watch('b_is_courtesy');

  return (
    <>
      <FormField
        control={form.control}
        name="v_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="Nome completo"
                maxLength={100}
                {...field}
                value={typeof field.value === 'string' ? limitName(field.value) : ''}
                onChange={(event) => {
                  const nextValue = limitName(event.target.value);
                  event.target.value = nextValue;
                  field.onChange(nextValue);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="v_email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>E-mail <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                maxLength={50}
                {...field}
                value={typeof field.value === 'string' ? limitEmail(field.value) : ''}
                onChange={(event) => {
                  const nextValue = limitEmail(event.target.value);
                  event.target.value = nextValue;
                  field.onChange(nextValue);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="v_document"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input
                  placeholder="00.000.000/0000-00"
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
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  {...field}
                  value={typeof field.value === 'string' ? normalizePhone(field.value) : ''}
                  onChange={(event) => {
                    const nextValue = normalizePhone(event.target.value);
                    event.target.value = nextValue;
                    field.onChange(nextValue);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {!isEdit ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="v_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Confirmar senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}

      <FormField
        control={form.control}
        name="b_is_courtesy"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Acesso cortesia</FormLabel>
              <FormDescription>O localizador nao possui cobranca recorrente e permanece com assinatura ativa.</FormDescription>
            </div>
          </FormItem>
        )}
      />

      {!isCourtesy ? (
        <FormField
          control={form.control}
          name="i_pricing_plan_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plano de precificacao <span className="text-red-500">*</span></FormLabel>
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pricingPlans.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      Nenhum plano disponivel
                    </SelectItem>
                  ) : null}
                  {pricingPlans.map((pricingPlan) => (
                    <SelectItem key={pricingPlan.i_id} value={String(pricingPlan.i_id)}>
                      {pricingPlan.v_name} - {formatCurrency(pricingPlan.f_operator_price)} / {formatCurrency(pricingPlan.f_preposto_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                O valor do operador sera somado ao valor por preposto ativo.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <FormField
        control={form.control}
        name="i_user_limit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limite de prepostos</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                placeholder="0"
                {...field}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            </FormControl>
            <FormDescription>Quantidade maxima de prepostos ativos vinculados a esse localizador.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}