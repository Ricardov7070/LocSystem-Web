import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '../../../components/ui/breadcrumb';
import { TopbarBreadcrumb } from './item';
import { Separator } from '../../../components/ui/separator';
import { SidebarTrigger } from '../../../components/ui/sidebar';

type TopbarProps = {
  children?: React.ReactNode;
  breadcrumbs?: {
    label: string;
    href?: string;
  }[];
};

export function Topbar({ children, breadcrumbs = [] }: TopbarProps) {
  const finalBreadcrumbs = [{ label: 'Módulo' }, ...breadcrumbs];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/85 backdrop-blur-md transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />

        <Separator orientation="vertical" className="mr-2 h-4" />

        <Breadcrumb>
          <BreadcrumbList>
            {finalBreadcrumbs.map(({ label, href }, index) => {
              return (
                <Fragment key={index}>
                  <TopbarBreadcrumb href={href}>{label}</TopbarBreadcrumb>

                  {index < breadcrumbs.length && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {children}
    </header>
  );
}
