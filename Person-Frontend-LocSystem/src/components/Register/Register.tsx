import React from 'react';
import { z } from 'zod';
import { match } from 'ts-pattern';
import { useForm } from 'react-hook-form';
import { Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CustomAlert from "../../hooks/useCustomAlert";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import AuthLayout from '../layout/layout';


const formSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório').max(100, 'O nome deve ter no máximo 100 caracteres'),
  email: z.string().email('O e-mail é inválido').max(50, 'O e-mail deve ter no máximo 50 caracteres'),
  document: z.string().min(1, 'O documento é obrigatório').max(18, 'O documento deve ter no máximo 18 caracteres'),
  phone: z.string().min(1, 'O telefone é obrigatório').max(15, 'O telefone deve ter no máximo 15 caracteres'),
  category: z.enum(['ADMIN', 'OPERATOR', 'AUDITOR', 'OLHEIRO', 'LINKED_USER'] as const, {
    error: 'O campo precisa ser uma opção válida.',
  }),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres').max(16, 'A senha deve ter no máximo 16 caracteres'),
  confirmPassword: z.string().min(8, 'Confirme sua senha').max(16, 'A senha deve ter no máximo 16 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});


type FormValues = z.infer<typeof formSchema>;


export default function Register() {

  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      document: '',
      phone: '',
      category: undefined,
      password: '',
      confirmPassword: '',
    },
  });


  const [alertInfo, setAlertInfo] = React.useState<{ message: string; type: "success" | "error" | "warning" | "info" } | null>(null);


  const showAlert = (message: string, type: "success" | "error" | "warning" | "info") => {
    setAlertInfo({ message, type });
  };


  const decodeSafe = (str: any) => {

    if (typeof str !== 'string') return str;
    try {
      return str.replace(/\\u([\d\w]{4})/gi, (_match, grp) => String.fromCharCode(parseInt(grp, 16)));
    } catch {
      return str;
    }

  };


  const signUpMutation = useMutation({

    mutationFn: async (values: FormValues) => {

      const response = await api.post("/auth/signup", {
        v_name: values.name,
        v_email: values.email,
        v_document: values.document.replace(/\D/g, ''),
        v_phone: values.phone.replace(/\D/g, ''),
        e_role: values.category,
        v_password: values.password
      });
   
      return { data: response.data, values };

    },
    
    onSuccess: ({ data }) => {

      showAlert(`✅ ${data.success}`, "success");

      setTimeout(() => {
        navigate('/login');
      }, 1500);

    },

    onError: (error: any) => {

      if (error.response) {

        const { status, data } = error.response;

        if ((status === 422) && data?.errors) {

          const erros = data.errors;

          if (erros.v_name) {
            form.setError('name', { type: 'manual', message: decodeSafe(erros.v_name?.[0]) });
          }
          if (erros.v_email) {
            form.setError('email', { type: 'manual', message: decodeSafe(erros.v_email?.[0]) });
          }
          if (erros.v_document) {
            form.setError('document', { type: 'manual', message: decodeSafe(erros.v_document?.[0]) });
          }
          if (erros.v_phone) {
            form.setError('phone', { type: 'manual', message: decodeSafe(erros.v_phone?.[0]) });
          }
          if (erros.v_password) {
            form.setError('password', { type: 'manual', message: decodeSafe(erros.v_password?.[0]) });
          }
          if (erros.e_role) {
            let backendMessage = decodeSafe(erros.e_role?.[0]);
            
            if (typeof backendMessage === 'string' && (backendMessage.toLowerCase().includes("expected one of") || backendMessage.toLowerCase().includes("invalid option"))) {
              backendMessage = "O campo precisa ser uma opção válida.";
            }

            form.setError('category', { type: 'manual', message: backendMessage });
          }
      
        } else if (status === 409) {

          showAlert(`⚠️ ${decodeSafe(data.info)}`, "info");
       
        } else {
         
          showAlert(`🚫 ${decodeSafe(data.error)}`, "error");

        }

      } else {

        showAlert(`🚫 Ocorreu um erro inesperado ao conectar com a API.`, "error");
   
      }
    
    }

  });


  const errorMessage = signUpMutation.isError 
    ? decodeSafe((signUpMutation.error as any).response?.data?.error || (signUpMutation.error as any).response?.data?.warning || (signUpMutation.error as any).response?.data?.info || signUpMutation.error.message || "Erro de validação")
    : null;


  const isFormError = signUpMutation.isError && ((signUpMutation.error as any).response?.status === 400 || (signUpMutation.error as any).response?.status === 422);


  return (
    <>
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      )}
      <AuthLayout hideHeader={true}>
        <div className="w-full">
          <header className="mb-5 text-center">
            <h2 className="text-xl font-semibold text-white">Criar Conta</h2>
          </header>

          <Form {...form}>
            <form
              onChange={() => {
                if (signUpMutation.isError) {
                  signUpMutation.reset();
                }
              }}
              onSubmit={form.handleSubmit((values) =>
                signUpMutation.mutate(values)
              )}
              className="flex flex-col space-y-3"
            >
              {signUpMutation.isError && !isFormError && (
                <Alert variant="destructive" className="bg-red-500/20 text-red-100 border-red-500/50 mb-4">
                  <AlertTitle className="font-bold text-red-100">Atenção!</AlertTitle>
                  <AlertDescription className="text-red-50">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Nome Completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome completo"
                        className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-semibold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="E-mail de acesso"
                        className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-semibold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Documento (RG, CPF ou CNPJ)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Somente números"
                        className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          let formatted = value;
                          
                          if (value.length <= 9) {
                            formatted = value
                              .replace(/(\d{2})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d{1,2})/, '$1-$2');
                          } else if (value.length <= 11) {
                            formatted = value
                              .replace(/(\d{3})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d{1,2})/, '$1-$2');
                          } else {
                            formatted = value
                              .replace(/(\d{2})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d)/, '$1/$2')
                              .replace(/(\d{4})(\d)/, '$1-$2')
                              .slice(0, 18);
                          }
                          field.onChange(formatted);
                        }}
                        maxLength={18}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-semibold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          let formatted = value;

                          if (value.length <= 10) {
                            formatted = value
                              .replace(/(\d{2})(\d)/, '($1) $2')
                              .replace(/(\d{4})(\d)/, '$1-$2');
                          } else {
                            formatted = value
                              .replace(/(\d{2})(\d)/, '($1) $2')
                              .replace(/(\d{5})(\d)/, '$1-$2')
                              .slice(0, 15);
                          }
                          
                          field.onChange(formatted);
                        }}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-semibold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Categoria de Usuário</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="cursor-pointer border-white/20 bg-white/10 text-white backdrop-blur-sm focus:border-white/40 focus:ring-0 focus:ring-offset-0">
                          <SelectValue placeholder="Selecione uma categoria" className="placeholder:text-gray-400" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-white/20 bg-zinc-900 text-white">
                        <SelectItem className="cursor-pointer focus:bg-white/10 focus:text-white" value="ADMIN">ADMINISTRADOR</SelectItem>
                        <SelectItem className="cursor-pointer focus:bg-white/10 focus:text-white" value="OPERATOR">OPERADOR</SelectItem>
                        <SelectItem className="cursor-pointer focus:bg-white/10 focus:text-white" value="AUDITOR">AUDITOR</SelectItem>
                        <SelectItem className="cursor-pointer focus:bg-white/10 focus:text-white" value="OLHEIRO">OLHEIRO</SelectItem>
                        <SelectItem className="cursor-pointer focus:bg-white/10 focus:text-white" value="LINKED_USER">USUÁRIO VINCULADO</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-500 font-semibold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite sua senha"
                        className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-semibold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirme sua senha"
                        className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-semibold" />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-8 flex items-center justify-between pt-2">
              <Button 
                asChild
                variant="outline"
                className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white"
              >
                <Link to="/login">
                  <ArrowLeft className="mr-2 size-4" />
                  Voltar
                </Link>
              </Button>

              <Button 
                type="submit" 
                disabled={signUpMutation.isPending}
                className="cursor-pointer !bg-blue-600 !text-white hover:!bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
              >
                {match(signUpMutation.status)
                  .with('pending', () => (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Registrando
                    </>
                  ))
                  .otherwise(() => (
                    <>
                      Cadastrar
                      <UserPlus className="ml-2 size-4" />
                    </>
                  ))}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AuthLayout>
    </>
  );
}