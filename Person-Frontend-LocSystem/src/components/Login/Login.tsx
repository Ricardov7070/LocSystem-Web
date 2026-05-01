'use client';

import React from 'react';
import { z } from 'zod';
import { match } from 'ts-pattern';
import { useForm } from 'react-hook-form';
import { Loader2, LogIn, Save } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import CustomAlert from "../../hooks/useCustomAlert";

import api from '../../services/api';

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
import AuthLayout from '../layout/layout';


const formSchema = z.object({
  email: z.string().email('E-mail inválido').max(50, 'O e-mail deve ter no máximo 50 caracteres'),
  password: z.string().min(1, 'A senha é obrigatória').max(16, 'A senha deve ter no máximo 16 caracteres'),
});


const resetSchema = z.object({
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres').max(16, 'A senha deve ter no máximo 16 caracteres'),
  confirmPassword: z.string().min(8, 'Confirme sua senha').max(16, 'A senha deve ter no máximo 16 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});


type FormValues = z.infer<typeof formSchema>;
type ResetValues = z.infer<typeof resetSchema>;


export default function Login() {

  const navigate = useNavigate();
  const [isResetMode, setIsResetMode] = React.useState(false);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });


  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
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


  const signInMutation = useMutation({

    mutationFn: async (values: FormValues) => {

      const response = await api.post("/auth/signin", {
        v_email: values.email,
        v_password: values.password
      });

      return { data: response.data, values };

    },
    
    onSuccess: ({ data, values }) => {

      showAlert(`✅ ${data.success}`, "success");

      const token = data.token ?? data.access_token ?? data.user?.token;
      if (token) {
        localStorage.setItem('locsystem_token', token);
      }

      const stored = localStorage.getItem('locsystem_user');
      const current = stored ? JSON.parse(stored) : {};
      localStorage.setItem('locsystem_user', JSON.stringify({
        ...current,
        email: values.email,
        name: data.name ?? data.user?.name ?? values.email,
        role: data.role ?? data.user?.role ?? current.role ?? 'ADMIN',
        id: data.id ?? data.user?.id ?? current.id ?? '',
        image: data.image ?? data.user?.image ?? current.image ?? undefined,
      }));

      setTimeout(() => {
        navigate("/vehicles");
      }, 1500);
      
    },

    onError: (error: any) => {

      if (error.response) {

        const { status, data } = error.response;

        if (status === 409) {

          resetForm.reset({ password: '', confirmPassword: '' }); 
          setIsResetMode(true);
          showAlert(`✏️ ${data.info}`, "info");

        } else if ((status === 422) && data?.errors) {

          const erros = data.errors;

          if (erros.v_password) {
            form.setError('password', { type: 'manual', message: decodeSafe(erros.v_password?.[0]) });
          }
          if (erros.v_email) {
            form.setError('email', { type: 'manual', message: decodeSafe(erros.v_email?.[0]) });
          }
      
        } else if (status === 401) {
         
          showAlert(`⚠️ ${decodeSafe(data.info)}`, "warning");
       
        } else if (status === 403) {

          showAlert(`⚠️ ${decodeSafe(data.info)}`, "info");

        } else {
         
          showAlert(`🚫 ${decodeSafe(data.error)}`, "error");

        }

      } else {

        showAlert(`🚫 Ocorreu um erro inesperado ao conectar com a API.`, "error");
   
      }
    
    }

  });


  const errorMessage = signInMutation.isError 
    ? decodeSafe((signInMutation.error as any).response?.data?.error || (signInMutation.error as any).response?.data?.warning || (signInMutation.error as any).response?.data?.info || signInMutation.error.message || "Erro de validação")
    : null;

  const isFormError = signInMutation.isError && ((signInMutation.error as any).response?.status === 400 || (signInMutation.error as any).response?.status === 422 || (signInMutation.error as any).response?.status === 409);

  const resetPasswordMutation = useMutation({

    mutationFn: async (values: ResetValues) => {

      const response = await api.put("/auth/updatePassword", {
        v_email: form.getValues("email"),
        v_password: values.password
      });

      return { data: response.data, values };

    },

    onSuccess: ({ data }) => {
    
      showAlert(`✅ ${data.success}`, "success");
      
      form.setValue('password', '');
      resetForm.reset();

      setTimeout(() => {
        setIsResetMode(false);
      }, 1500);

    },

    onError: (error: any) => {

      if (error.response) {

        const { status, data } = error.response;

        if ((status === 422) && data?.errors) {
          
          const erros = data.errors;
               
          if (erros.v_password) {
            form.setError('password', { type: 'manual', message: decodeSafe(erros.v_password?.[0]) });
          }

        } else {

          showAlert(`🚫 ${decodeSafe(data.error)}`, "error");

        }
    
      } else {

        showAlert(`🚫 Ocorreu um erro inesperado ao conectar com a API.`, "error");
     
      }
   
    }

  });


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
      <AuthLayout>
        <div className="w-full">
          {!isResetMode ? (
            <>
              <header className="mb-5 text-center">
                <h2 className="font-semibold text-white text-xl">Faça login</h2>
              </header>

              <Form {...form}>
                <form
                  onChange={() => {
                    if (signInMutation.isError) {
                      signInMutation.reset();
                    }
                  }}
                  onSubmit={form.handleSubmit((values) => signInMutation.mutate(values))}
                  className="space-y-3"
                >
                  {signInMutation.isError && !isFormError && (
                    <Alert variant="destructive" className="bg-red-500/20 text-red-100 border-red-500/50 mb-4">
                      <AlertTitle className="font-bold text-red-100">Atenção!</AlertTitle>
                      <AlertDescription className="text-red-50">{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="E-mail"
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Senha"
                            className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 font-semibold" />
                      </FormItem>
                    )}
                  />

                  <div className="mt-6 flex items-center justify-between">
                    <Button asChild variant="link" className="cursor-pointer px-0 text-sm text-gray-300 hover:text-white">
                      <Link to="/forgot-password">
                        Esqueceu sua senha?
                      </Link>
                    </Button>

                    <div className="flex items-center gap-3">
                      <Button 
                        asChild
                        variant="outline"
                        className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white"
                      >
                        <Link to="/register">
                          Cadastrar
                        </Link>
                      </Button>
                      
                      <Button 
                        type="submit" 
                        disabled={signInMutation.isPending}
                        className="cursor-pointer !bg-blue-600 !text-white hover:!bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
                      >
                        {match(signInMutation.status)
                          .with('pending', () => (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              Entrando
                            </>
                          ))
                          .otherwise(() => (
                            <>
                              Entrar
                              <LogIn className="ml-2 size-4" />
                            </>
                          ))}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </>
          ) : (
            <>
              <header className="mb-5 text-center">
                <h2 className="font-semibold text-white text-xl">Cadastrar Nova Senha</h2>
                <p className="text-sm text-gray-300 mt-2">Foi identificado um conflito de credenciais, recadastre sua senha para continuar.</p>
              </header>

              <Form {...resetForm}>
                <form
                  key="reset-mode-active"
                  onSubmit={resetForm.handleSubmit((values) => resetPasswordMutation.mutate(values))}
                  className="space-y-3"
                >
                  <FormField
                    control={resetForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Nova Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Digite sua nova senha"
                            className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                            maxLength={16}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 font-semibold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Confirmar Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Repita sua nova senha"
                            className="border-white/20 bg-white/10 text-white backdrop-blur-sm placeholder:text-gray-400 focus:border-white/40 focus:bg-white/20"
                            maxLength={16}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 font-semibold" />
                      </FormItem>
                    )}
                  />

                  <div className="mt-8 flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsResetMode(false)}
                      className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={resetPasswordMutation.isPending}
                      className="cursor-pointer !bg-blue-600 !text-white hover:!bg-blue-700 font-medium h-10 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
                    >
                      {resetPasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Salvando
                        </>
                      ) : (
                        <>
                          Salvar Nova Senha
                          <Save className="ml-2 size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </div>
      </AuthLayout>
    </>
  );
}
