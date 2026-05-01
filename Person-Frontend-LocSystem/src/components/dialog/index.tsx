/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { create } from 'zustand';
import { match } from 'ts-pattern';
import { Loader2, Save } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { DefaultValues, UseFormReturn, useForm } from 'react-hook-form';
import { ReactNode, useCallback, useEffect, useTransition } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { cn } from '../../lib/utils';
import { Form } from '../ui/form';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';

interface DialogBaseProps {
  contentClassname?: string;
  description?: ReactNode;
  footer?: ReactNode;
}

interface DialogConfirmProps extends DialogBaseProps {
  cancelText?: string;
  actionText?: string;
}

interface DialogInfoProps extends DialogBaseProps {
  closeText?: string;
  info: ReactNode;
}

interface DialogActionProps<T = unknown> {
  label: string;
  value: T;
}

interface DialogActionsProps<
  Actions extends Readonly<DialogActionProps[]> = Readonly<DialogActionProps[]>,
> extends DialogBaseProps {
  actions: Actions;
}

interface DialogFormProps<
  Schema extends z.ZodTypeAny = z.ZodTypeAny,
  Result = any,
> extends DialogBaseProps {
  schema: Schema;
  defaultValues?: DefaultValues<any>;
  submitText?: string;
  cancelText?: string;
  form(form: UseFormReturn<any>): ReactNode;
  handler?(ctx: {
    form: UseFormReturn<any>;
    data: z.TypeOf<Schema>;
    utils: ContextUtils;
  }): Promise<Result>;
}

type DialogProps =
  | { type: 'confirm'; props: DialogConfirmProps }
  | { type: 'actions'; props: DialogActionsProps }
  | { type: 'info'; props: DialogInfoProps }
  | { type: 'form'; props: DialogFormProps };

type BasicFunction<Params extends unknown[] = unknown[], Return = unknown> = (
  ...args: Params
) => Return;

interface DialogStore {
  promise: BasicFunction | null;
  title: string | null;
  props: DialogProps;
  clear(): void;
}

const dialogStore = create<DialogStore>((set) => ({
  promise: null,
  title: null,
  props: {} as DialogProps,

  clear() {
    set({
      promise: null,
      title: null,
      props: {} as DialogProps,
    });
  },
}));

export const dialog = {
  confirm(title: string, props?: DialogConfirmProps) {
    return new Promise<boolean>((resolve) => {
      dialogStore.setState({
        title,
        promise: resolve as BasicFunction,
        props: {
          type: 'confirm',
          props: { ...props },
        },
      });
    });
  },

  actions<Actions extends Readonly<DialogActionProps[]>>(
    title: string,
    props: DialogActionsProps<Actions>
  ) {
    return new Promise<Actions[number]['value'] | false>((resolve) => {
      dialogStore.setState({
        title,
        promise: resolve,
        props: { type: 'actions', props },
      });
    });
  },

  form<Schema extends z.ZodTypeAny, Result = null>(
    title: string,
    props: DialogFormProps<Schema, Result>
  ) {
    type Response = Result extends null ? z.TypeOf<Schema> : Result;

    return new Promise<Response | false>((resolve) => {
      dialogStore.setState({
        title,
        promise: resolve as BasicFunction,
        props: {
          type: 'form',
          props: props as unknown as DialogFormProps,
        },
      });
    });
  },

  info(title: string, props: DialogInfoProps) {
    return new Promise<void>((resolve) => {
      dialogStore.setState({
        title,
        promise: resolve as BasicFunction,
        props: { type: 'info', props },
      });
    });
  },
};

function createContextUtils({ form }: { form: UseFormReturn<any> }) {
  return {
    validateError(error: Error) {
      form.setError('root', { message: error.message });
      throw error;
    },
    setErrorMessage(message: string, path?: string) {
      form.setError((path ?? 'root') as any, { message });
    },
  };
}

type ContextUtils = ReturnType<typeof createContextUtils>;

export function Dialoger() {
  const { promise, title, props, clear } = dialogStore();

  const handleAction = useCallback(
    (value?: unknown) => {
      clear();
      promise?.(value || true);
    },
    [promise, clear]
  );

  const handleCancel = useCallback(() => {
    clear();
    promise?.(false);
  }, [promise, clear]);

  const open = !!promise && !!title && !!props;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleCancel]);

  return (
    <>
      {props.type && ['confirm', 'actions'].includes(props.type) && (
        <AlertDialog open={open}>
          <AlertDialogContent className={cn(props.props?.contentClassname)}>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {props.props && (
                <AlertDialogDescription>
                  {props.props.description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>

            {match(props)
              .with({ type: 'confirm' }, ({ props }) => (
                <AlertDialogFooter>
                  {props.footer}
                  <AlertDialogCancel onClick={() => handleCancel()}>
                    {props.cancelText || 'Cancelar'}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction()}>
                    {props.actionText || 'Continuar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              ))
              .with({ type: 'actions' }, ({ props }) => (
                <AlertDialogFooter>
                  {props.footer}
                  {props.actions.map((action, index) => (
                    <AlertDialogAction
                      key={index}
                      onClick={() => handleAction(action.value)}
                    >
                      {action.label}
                    </AlertDialogAction>
                  ))}
                </AlertDialogFooter>
              ))
              .otherwise(() => null)}
          </AlertDialogContent>
        </AlertDialog>
      )}

      {props.type === 'info' && (
        <Dialog open={open}>
          <DialogContent className={cn('max-w-4xl', props.props?.contentClassname)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {props.props && (
                <DialogDescription>{props.props.description}</DialogDescription>
              )}
            </DialogHeader>

            {match(props)
              .with({ type: 'info' }, ({ props }) => (
                <>
                  {props.info}
                  <DialogFooter>
                    {props.footer}
                    <Button onClick={() => handleAction()}>
                      {props.closeText || 'Fechar'}
                    </Button>
                  </DialogFooter>
                </>
              ))
              .otherwise(() => null)}
          </DialogContent>
        </Dialog>
      )}

      {props.type === 'form' && (
        <Dialog open={open}>
          <DialogContent className={cn('max-w-2xl', props.props?.contentClassname)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {props.props && (
                <DialogDescription>{props.props.description}</DialogDescription>
              )}
            </DialogHeader>

            {match(props)
              .with({ type: 'form' }, ({ props }) => {
                function WithForm() {
                  const [isLoading, startTransition] = useTransition();

                  const form = useForm({
                    resolver: zodResolver(props.schema as any),
                    defaultValues: props.defaultValues,
                    criteriaMode: 'all',
                    mode: 'onSubmit',
                  });

                  const handleSubmit = form.handleSubmit(async (data) => {
                    startTransition(async () => {
                      if (props.handler) {
                        try {
                          const result = await props.handler({
                            form,
                            data,
                            utils: createContextUtils({ form }),
                          });
                          return handleAction(result);
                        } catch (error: any) {
                          form.setError('root', { message: error.message });
                          return;
                        }
                      }
                      handleAction(data);
                    });
                  });

                  return (
                    <Form {...form}>
                      <form onSubmit={handleSubmit} className="space-y-3">
                        {form.formState.errors?.root && (
                          <Alert variant="destructive">
                            {form.formState.errors?.root.message}
                          </Alert>
                        )}

                        <div className="mb-3 flex flex-col space-y-2">
                          {props.form(form)}
                        </div>

                        <DialogFooter>
                          {props.footer}
                          <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer !border-white/20 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white"
                            onClick={() => handleCancel()}
                          >
                            {props.cancelText ?? 'Cancelar'}
                          </Button>
                          <Button type="submit" variant="success" disabled={isLoading}>
                            Salvar
                            {isLoading ? (
                              <Loader2 className="ml-2 size-4 animate-spin" />
                            ) : (
                              <Save className="ml-2 size-4" />
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  );
                }

                return <WithForm />;
              })
              .otherwise(() => null)}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
