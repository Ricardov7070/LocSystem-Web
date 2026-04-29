'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { cn } from '../lib/utils';
import { Calendar } from './ui/calendar';
import { Button, type ButtonProps } from './ui/button';

interface DateRangePickerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  date?: DateRange;
  onDateChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  triggerVariant?: Exclude<ButtonProps['variant'], 'destructive' | 'link'>;
  triggerSize?: Exclude<ButtonProps['size'], 'icon'>;
  triggerClassName?: string;
}

export function DateRangePicker({
  date,
  onDateChange,
  placeholder = 'Selecione as datas',
  triggerVariant = 'outline',
  triggerSize = 'default',
  triggerClassName,
  className,
  ...props
}: DateRangePickerProps) {
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={cn(
              'w-full justify-start gap-2 truncate text-left font-normal',
              !date && 'text-muted-foreground',
              triggerClassName
            )}
          >
            <CalendarIcon className="size-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                  {format(date.to, 'dd/MM/yyyy', { locale: ptBR })}
                </>
              ) : (
                format(date.from, 'dd/MM/yyyy', { locale: ptBR })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-auto p-0', className)} {...props}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
