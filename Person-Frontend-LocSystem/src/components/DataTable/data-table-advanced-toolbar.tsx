'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import type { DataTableAdvancedFilterField } from '../../lib/types/data-table';

import { cn } from '../../lib/utils';
import { DataTableFilterList } from '../../components/DataTable/data-table-filter-list';
import { DataTableViewOptions } from '../../components/DataTable/data-table-view-options';

interface DataTableAdvancedToolbarProps<TData>
  extends React.HTMLAttributes<HTMLDivElement> {
  table: Table<TData>;
  filterFields: DataTableAdvancedFilterField<TData>[];
  debounceMs?: number;
  shallow?: boolean;
}

export function DataTableAdvancedToolbar<TData>({
  table,
  filterFields = [],
  debounceMs = 300,
  shallow = true,
  children,
  className,
  ...props
}: DataTableAdvancedToolbarProps<TData>) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-2 overflow-auto p-1',
        className
      )}
      {...props}
    >
      <DataTableFilterList
        filterFields={filterFields}
        debounceMs={debounceMs}
        shallow={shallow}
      />
      <div className="flex items-center gap-2">
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
