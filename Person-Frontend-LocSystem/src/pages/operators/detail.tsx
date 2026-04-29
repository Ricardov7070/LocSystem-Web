import { useParams } from 'react-router-dom';
import { Ellipsis, AlertTriangle } from 'lucide-react';

import { Topbar } from '../../components/layout/app-topbar';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

export default function OperatorDetailPage() {
  useParams<{ id: string }>();

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: 'Localizadores', href: '/users/operators' },
          { label: 'Detalhes do Localizador' },
        ]}
      />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Localizador</h1>
          <p className="text-muted-foreground">Detalhes do Localizador</p>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem>Renovar Assinatura</DropdownMenuItem>
              <DropdownMenuItem>Alterar Senha</DropdownMenuItem>
              <DropdownMenuItem>Resetar 2FA</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Bloquear</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        {/* Subscription Alert */}
        <Alert className="border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Assinatura inativa</AlertTitle>
          <AlertDescription>
            Este operador não possui uma assinatura ativa.
          </AlertDescription>
        </Alert>

        {/* Operator Info */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Informações do Localizador</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {[
                { label: 'Nome', value: '—' },
                { label: 'E-mail', value: '—' },
                { label: 'Documento', value: '—' },
                { label: 'Telefone', value: '—' },
                { label: 'Função', value: <Badge variant="secondary">OPERATOR</Badge> },
                { label: 'Tipo de Acesso', value: <Badge>Mensalista</Badge> },
                { label: 'Limite de Prepostos', value: '—' },
                { label: 'Plano de Precificação', value: '—' },
                { label: 'Valor Total Mensal', value: '—' },
                { label: 'Vencimento', value: '—' },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">{row.label}</span>
                    <span className="text-sm">{row.value}</span>
                  </div>
                  {i < arr.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Device Info */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Dispositivo Móvel</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <span className="text-sm text-muted-foreground">Nenhum dispositivo vinculado</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Prepostos Table */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Prepostos</h2>
          <Card className="p-6">
            <div className="overflow-auto rounded-lg border">
              <div className="grid grid-cols-[minmax(200px,3fr)_minmax(200px,3fr)_minmax(140px,1fr)_minmax(100px,1fr)] gap-4 border-b p-4 font-medium text-muted-foreground text-sm">
                <div>Nome</div>
                <div>E-mail</div>
                <div>Criado em</div>
                <div>Status</div>
              </div>
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                Nenhum preposto cadastrado
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
