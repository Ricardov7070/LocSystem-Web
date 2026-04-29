import { Trash2 } from 'lucide-react';

import { cn } from '../../lib/utils';

interface DataTableEmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  minHeightClassName?: string;
}

export function DataTableEmptyState({
  title,
  description,
  className,
  minHeightClassName = 'min-h-[360px]',
}: DataTableEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center px-6 py-16 text-center',
        minHeightClassName,
        className
      )}
    >
      <div className="mb-5 flex size-14 items-center justify-center">
        <Trash2 className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-medium text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}