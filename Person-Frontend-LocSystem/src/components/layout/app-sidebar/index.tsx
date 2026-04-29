/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useRef, useState } from 'react';
import {
  CarFront,
  Wallet,
  Scale,
  Users,
  Search,
  DollarSign,
  UserCheck,
  MapPin,
  Camera,
  Megaphone,
  Shield,
  Ban,
  ScrollText,
} from 'lucide-react';
import logoImage from '../../../assets/logo_locsystem.png';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from '../../ui/sidebar';
import { ScrollArea } from '../../ui/scroll-area';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';

import { TenantSwitcher } from './tenant-switcher';
import { useAuth } from '../../../components/providers/auth';

const roleAliases: Record<string, 'ADMIN' | 'OPERATOR' | 'AUDITOR'> = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  AUDITOR: 'AUDITOR',
  OLHEIRO: 'OPERATOR',
  LINKED_USER: 'AUDITOR',
  LINKEDUSER: 'AUDITOR',
};

const allNavItems = [
  {
    title: 'Veículos',
    url: '#',
    icon: CarFront,
    isActive: true,
    items: [
      {
        title: 'Listar',
        url: '/vehicles',
      },
      {
        title: 'Importações',
        url: '/vehicles/imports',
      },
    ],
    allowedRoles: ['ADMIN', 'OPERATOR', 'AUDITOR'],
  },
  {
    title: 'Planos',
    url: '/pricing',
    icon: DollarSign,
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'Carteiras',
    url: '/wallets',
    icon: Wallet,
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'Comarcas',
    url: '/counties',
    icon: MapPin,
    allowedRoles: ['OPERATOR'],
  },
  {
    title: 'Assessorias Jurídicas',
    url: '/legal-advisories',
    icon: Scale,
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'Veículos com Comunicados',
    url: '/vehicle-announcements',
    icon: Megaphone,
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'Usuários',
    url: '#',
    icon: Users,
    isActive: true,
    items: [
      {
        title: 'Cadastro Localizadores',
        url: '/users/operators',
      },
      {
        title: 'Cadastro Assessorias',
        url: '/users/advisory-users',
      },
      {
        title: 'Busca por Comarca',
        url: '/search-by-county',
      },
    ],
    allowedRoles: ['ADMIN', 'AUDITOR'],
  },
  {
    title: 'Meus Prepostos',
    url: '/users/my-deputies',
    icon: UserCheck,
    allowedRoles: ['OPERATOR'],
  },
  {
    title: 'Incidências',
    url: '#',
    icon: Search,
    isActive: true,
    items: [
      {
        title: 'Histórico',
        url: '/incidences',
      },
      {
        title: 'Retroativas',
        url: '/incidences-retroactive',
      },
    ],
    allowedRoles: ['ADMIN', 'OPERATOR', 'AUDITOR'],
  },
  {
    title: 'Começar Monitoramento',
    url: '/camera-monitoring',
    icon: Camera,
    allowedRoles: ['ADMIN', 'OPERATOR'],
    target: '_blank',
  },
  {
    title: 'Sessões Ativas',
    url: '/sessions',
    icon: Shield,
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'Banidos',
    url: '/banidos',
    icon: Ban,
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'Logs',
    url: '/logs',
    icon: ScrollText,
    allowedRoles: ['ADMIN'],
  },
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {};

export function AppSidebar({ ...props }: AppSidebarProps) {
  const { user } = useAuth();
  const { state } = useSidebar();
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 12, y: 10 });
  const [isHovered, setIsHovered] = useState(false);
  const normalizedRole =
    roleAliases[user.role?.trim().toUpperCase()] ?? user.role?.trim().toUpperCase();

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 20;
    const rotateY = ((x - centerX) / centerX) * 20;

    setRotation({ x: rotateX, y: rotateY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setRotation({ x: 12, y: 10 });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const canAccessRetroIncidences = (
    ['ADMIN', 'AUDITOR', 'OPERATOR'] 
  ).includes(normalizedRole);

  // TODO: Buscar contagem via API quando endpoint estiver disponível
  const unreadRetroCount = 0;

  const accessibleItems = allNavItems.filter((item) =>
    item.allowedRoles.includes(normalizedRole)
  );

  const navMain = (accessibleItems.length > 0 ? accessibleItems : allNavItems)
    .map((item) => {
      if (item.title === 'Veículos') {
        let filteredItems = item.items?.map((subItem: any) => {
          if (subItem.title === 'Importações') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isLocked, ...rest } = subItem;
            return rest;
          }
          return subItem;
        });

        if (normalizedRole === 'ADMIN') {
          filteredItems = item.items?.filter(
            (subItem) => subItem.title !== 'Importações'
          );
        }

        return {
          ...item,
          title:
            normalizedRole !== 'ADMIN' && normalizedRole !== 'AUDITOR'
              ? 'Base Privada'
              : item.title,
          items: filteredItems,
        };
      }

      if (item.title === 'Usuários') {
        const filteredItems = item.items?.filter((subItem) => {
          if (
            subItem.title === 'Cadastro Localizadores' ||
            subItem.title === 'Cadastro Assessorias'
          ) {
            return normalizedRole === 'ADMIN';
          }
          if (subItem.title === 'Busca por Comarca') {
            return normalizedRole === 'ADMIN' || normalizedRole === 'AUDITOR';
          }
          return true;
        });

        return {
          ...item,
          items: filteredItems,
        };
      }

      if (item.title === 'Incidências') {
        const mappedItems = item.items?.map((subItem) => {
          if (subItem.title === 'Retroativas' && canAccessRetroIncidences) {
            return {
              ...subItem,
              badge: unreadRetroCount,
            };
          }
          return subItem;
        });

        return {
          ...item,
          items: mappedItems,
        };
      }

      return item;
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenuButton
          size="lg"
          className="h-auto justify-center overflow-visible bg-transparent p-0 hover:bg-transparent data-[state=open]:bg-transparent group-data-[collapsible=icon]:p-0"
        >
          <div className="flex w-full justify-center py-2 group-data-[collapsible=icon]:py-1.5">
            {state === 'collapsed' ? (
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_10px_24px_rgba(0,0,0,0.55)]">
                <img
                  src={logoImage}
                  alt="LocSystem Logo"
                  className="h-7 w-7 object-contain"
                />
              </div>
            ) : (
              <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={handleMouseEnter}
                className="group relative h-32 w-32 [perspective:1000px] cursor-pointer"
              >
                <div
                  className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black p-2 shadow-[0_25px_50px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.05)] transition-all ease-out"
                  style={{
                    transitionDuration: isHovered ? '50ms' : '500ms',
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${isHovered ? 1.05 : 1})`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-20 rounded-[10px] bg-gradient-to-br from-white/10 via-white/5 to-transparent transition-transform duration-300"
                    style={{ transform: 'translateZ(10px)' }}
                  />

                  <img
                    src={logoImage}
                    alt="LocSystem Logo"
                    className="relative z-10 h-full w-full scale-[1.25] object-contain drop-shadow-[0_20px_15px_rgba(0,0,0,0.8)] transition-transform duration-300"
                    style={{
                      transform: isHovered
                        ? 'translateZ(30px) scale(1.25)'
                        : 'translateZ(0px) scale(1.25)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="h-full flex-1">
          <NavMain items={navMain} />
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <TenantSwitcher />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
