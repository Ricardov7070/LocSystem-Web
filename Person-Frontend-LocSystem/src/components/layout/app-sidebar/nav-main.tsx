'use client';

import { ChevronRight, Lock, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '../../../components/ui/sidebar';
import { Badge } from '../../../components/ui/badge';

type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  isLocked?: boolean;
  target?: string;
  items?: {
    title: string;
    url: string;
    badge?: number;
    isLocked?: boolean;
  }[];
};

export function NavMain({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Plataforma</SidebarGroupLabel>

      <SidebarMenu>
        {items.map((item) => {
          if (!item.items) {
            const isActive =
              pathname === item.url || pathname.startsWith(item.url + '/');

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive}>
                  {item.isLocked ? (
                    <div className="flex w-full cursor-not-allowed items-center opacity-60">
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <Lock className="ml-auto h-4 w-4" />
                    </div>
                  ) : (
                    <Link
                      to={item.url}
                      target={item.target}
                      rel={
                        item.target === '_blank'
                          ? 'noopener noreferrer'
                          : undefined
                      }
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          const hasActiveSubItem = item.items?.some(
            (subItem) =>
              pathname === subItem.url || pathname.startsWith(subItem.url + '/')
          );

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || hasActiveSubItem}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isActive =
                        pathname === subItem.url ||
                        (pathname.startsWith(subItem.url + '/') &&
                          !item.items?.some(
                            (otherItem) =>
                              otherItem.url !== subItem.url &&
                              otherItem.url.length > subItem.url.length &&
                              pathname.startsWith(otherItem.url)
                          ));

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive}
                            className="w-full"
                          >
                            {subItem.isLocked ? (
                              <div className="flex min-w-full cursor-not-allowed items-center opacity-60">
                                <span className="flex whitespace-nowrap">
                                  {subItem.title}
                                </span>
                                <Lock className="ml-auto h-4 w-4" />
                              </div>
                            ) : (
                              <Link to={subItem.url}>
                                <span className="flex whitespace-nowrap">
                                  {subItem.title}
                                </span>

                                {subItem.badge !== undefined && (
                                  <Badge
                                    variant={
                                      subItem.badge > 0
                                        ? 'destructive'
                                        : 'secondary'
                                    }
                                    className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-xs"
                                  >
                                    {subItem.badge}
                                  </Badge>
                                )}
                              </Link>
                            )}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
