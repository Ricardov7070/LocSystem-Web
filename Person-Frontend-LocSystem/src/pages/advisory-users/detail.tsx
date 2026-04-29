import { useParams } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';

import { Topbar } from '../../components/layout/app-topbar';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

export default function AdvisoryUserDetailPage() {
  useParams<{ id: string }>();

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: 'Usuários de Assessoria', href: '/users/advisory-users' },
          { label: 'Detalhes' },
        ]}
      />

      <header className="container mx-auto mb-3 flex items-center justify-between px-10 py-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Usuário de Assessoria</h1>
          <p className="text-muted-foreground">Detalhes do Usuário</p>
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
              <DropdownMenuItem>Alterar Senha</DropdownMenuItem>
              <DropdownMenuItem>Resetar 2FA</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Bloquear</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto mb-10 space-y-6 px-10">
        {/* User Info */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Informações do Usuário</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {[
                { label: 'Nome', value: '—' },
                { label: 'E-mail', value: '—' },
                { label: 'Telefone', value: '—' },
                { label: 'Função', value: <Badge variant="secondary">AUDITOR</Badge> },
                { label: 'Status', value: <Badge>Ativo</Badge> },
                { label: 'Cadastrado em', value: '—' },
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

        {/* Associated Legal Advisories */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Assessorias Jurídicas Vinculadas</h2>
          <Card className="p-6">
            <div className="overflow-auto rounded-lg border">
              <div className="grid grid-cols-[1fr_1fr_80px] gap-4 border-b p-4 font-medium text-muted-foreground text-sm">
                <div>Nome da Assessoria</div>
                <div>Carteira</div>
                <div>Ações</div>
              </div>
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                Nenhuma assessoria vinculada
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
