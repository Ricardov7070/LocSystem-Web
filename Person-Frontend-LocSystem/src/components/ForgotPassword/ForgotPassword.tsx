import React from 'react';
import { z } from 'zod';
import { match } from 'ts-pattern';
import { useForm } from 'react-hook-form';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
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
import AuthLayout from '../layout/layout';


const formSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100, 'O nome deve ter no máximo 100 caracteres'),
  email: z.string().email('E-mail inválido').max(50, 'O e-mail deve ter no máximo 50 caracteres'),
});


type FormValues = z.infer<typeof formSchema>;


export default function ForgotPassword() {

  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
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


  const recoverPasswordMutation = useMutation({

    mutationFn: async (values: FormValues) => {
      const response = await api.post("/auth/forgotPassword", {
        v_name: values.name,
        v_email: values.email
      });
   
      return { data: response.data, values };
    },

    onSuccess: ({ data }) => {

      showAlert(`✅ ${data.success}`, "success");

      setTimeout(() => {
        navigate('/login');
      }, 5000);

    },

    onError: (error: any) => {

      if (error.response) {

        const { status, data } = error.response;

        if ((status === 422) && data?.errors) {

          const erros = data.errors;

          if (erros.v_name) {
            form.setError('name', { type: 'manual', message: decodeSafe(erros.v_name[0]) });
          }
          if (erros.v_email) {
            form.setError('email', { type: 'manual', message: decodeSafe(erros.v_email[0]) });
          }
      
        } else if (status === 401) {
         
          showAlert(`⚠️ ${decodeSafe(data.info)}`, "info");
       
        } else {
         
          showAlert(`🚫 ${decodeSafe(data.error)}`, "error");

        }

      } else {

        showAlert(`🚫 Ocorreu um erro inesperado ao conectar com a API.`, "error");
   
      }
    
    }

  });


  const errorMessage = recoverPasswordMutation.isError 
    ? decodeSafe((recoverPasswordMutation.error as any).response?.data?.error || (recoverPasswordMutation.error as any).response?.data?.warning || (recoverPasswordMutation.error as any).response?.data?.info || recoverPasswordMutation.error.message || "Erro de validação")
    : null;


  const isFormError = recoverPasswordMutation.isError && ((recoverPasswordMutation.error as any).response?.status === 400 || (recoverPasswordMutation.error as any).response?.status === 422);


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
            <h2 className="text-xl font-semibold text-white">Recuperar Senha</h2>
            <p className="mt-2 text-sm text-gray-300">
              Informe seu nome e e-mail para receber a sua nova chave de acesso.
            </p>
          </header>

          <Form {...form}>
            <form
              onChange={() => {
                if (recoverPasswordMutation.isError) {
                  recoverPasswordMutation.reset();
                }
              }}
              onSubmit={form.handleSubmit((values) =>
                recoverPasswordMutation.mutate(values)
              )}
              className="flex flex-col space-y-4"
            >
              {recoverPasswordMutation.isError && !isFormError && (
                <Alert variant="destructive" className="bg-red-500/20 text-red-100 border-red-500/50 mb-4">
                  <AlertTitle className="font-bold text-red-100">Atenção!</AlertTitle>
                  <AlertDescription className="text-red-50">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Seu nome"
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
                        placeholder="Seu e-mail de cadastro"
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
                disabled={recoverPasswordMutation.isPending}
                className="cursor-pointer !bg-blue-600 !text-white hover:!bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
              >
                {match(recoverPasswordMutation.status)
                  .with('pending', () => (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Enviando...
                    </>
                  ))
                  .otherwise(() => (
                    <>
                      Enviar Senha
                      <Send className="ml-2 size-4" />
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