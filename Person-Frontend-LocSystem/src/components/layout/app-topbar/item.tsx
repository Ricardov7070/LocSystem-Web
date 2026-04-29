import { Link } from 'react-router-dom';

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
} from '../../../components/ui/breadcrumb';
import { cn } from '../../../lib/utils';

type TopbarBreadcrumbProps = {
  children: React.ReactNode;
  href?: string;
};

export function TopbarBreadcrumb({ href, children }: TopbarBreadcrumbProps) {
  return (
    <BreadcrumbItem className={cn(href && 'hidden md:block')}>
      {href ? (
        <BreadcrumbLink asChild>
          <Link to={href}>{children}</Link>
        </BreadcrumbLink>
      ) : (
        <BreadcrumbPage>{children}</BreadcrumbPage>
      )}
    </BreadcrumbItem>
  );
}
