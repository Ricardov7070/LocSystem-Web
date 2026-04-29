'use client';

import { Check, ChevronsUpDown, LogOut, Sun, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
  SidebarMenu,
  useSidebar,
  SidebarMenuItem,
  SidebarMenuButton,
} from '../../../components/ui/sidebar';
import { Badge } from '../../../components/ui/badge';
import { useAuth } from '../../../components/providers/auth';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';

function initials(name: string | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const activeTheme =
    theme === 'light' || theme === 'dark' ? theme : resolvedTheme ?? 'dark';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="ring-1 ring-sidebar-ring data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback className="rounded-lg">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user.image && (
                    <AvatarImage src={user.image} alt={user.name} />
                  )}
                  <AvatarFallback className="rounded-lg">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <Link to="/profile">
                <DropdownMenuItem>
                  <User />
                  Conta
                </DropdownMenuItem>
              </Link>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun />
                  Tema:{' '}
                  <Badge
                    className={
                      activeTheme === 'dark'
                        ? 'border border-white/60 bg-transparent text-white'
                        : 'border border-black/60 bg-transparent text-black dark:text-white'
                    }
                  >
                    {activeTheme}
                  </Badge>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => setTheme('light')}
                      className={
                        activeTheme === 'light'
                          ? 'border border-black/50 bg-zinc-100 text-black dark:border-white/40 dark:bg-zinc-900 dark:text-white'
                          : undefined
                      }
                    >
                      {activeTheme === 'light' && <Check className="size-4" />}
                      Claro
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme('dark')}
                      className={
                        activeTheme === 'dark'
                          ? 'border border-white/50 bg-zinc-900 text-white'
                          : undefined
                      }
                    >
                      {activeTheme === 'dark' && <Check className="size-4" />}
                      Escuro
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
