'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';

import { cn } from '../../lib/utils';
import { buttonVariants } from '../../components/ui/button';

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('relative rounded-xl border border-zinc-300 p-4 pt-12 text-black dark:border-white/10 dark:text-white', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-6',
        month: 'flex flex-col gap-4',
        month_caption: 'flex min-h-8 items-center justify-center px-8',
        caption_label: 'text-sm font-semibold capitalize',
        nav: 'absolute left-4 right-4 top-4 z-10 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 rounded-md border-zinc-300 bg-white p-0 text-black opacity-80 hover:bg-zinc-100 hover:opacity-100 dark:border-white/10 dark:bg-[#111214] dark:text-white dark:hover:bg-[#1a1b1f]'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 rounded-md border-zinc-300 bg-white p-0 text-black opacity-80 hover:bg-zinc-100 hover:opacity-100 dark:border-white/10 dark:bg-[#111214] dark:text-white dark:hover:bg-[#1a1b1f]'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'mt-1 flex',
        weekday: 'w-9 rounded-md text-center text-[0.78rem] font-normal lowercase text-zinc-500 dark:text-zinc-400',
        week: 'mt-1 flex w-full',
        day: cn(
          'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-zinc-200 dark:[&:has([aria-selected])]:bg-zinc-800 [&:has([aria-selected].day-outside)]:bg-zinc-100 dark:[&:has([aria-selected].day-outside)]:bg-zinc-900/60 [&:has([aria-selected].day-range-end)]:rounded-r-md',
          props.mode === 'range'
            ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
            : '[&:has([aria-selected])]:rounded-md'
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 rounded-md p-0 font-medium text-black hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800 aria-selected:opacity-100'
        ),
        range_start: 'day-range-start',
        range_end: 'day-range-end',
        selected:
          'bg-zinc-800 text-white hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white dark:bg-zinc-200 dark:text-black dark:hover:bg-zinc-200 dark:hover:text-black dark:focus:bg-zinc-200 dark:focus:text-black',
        today: 'bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white',
        outside:
          'day-outside text-zinc-400 dark:text-zinc-600 opacity-50 aria-selected:bg-accent/50 aria-selected:text-zinc-400 dark:aria-selected:text-zinc-600 aria-selected:opacity-30',
        disabled: 'text-zinc-400 dark:text-zinc-600 opacity-50',
        range_middle:
          'aria-selected:bg-zinc-100 aria-selected:text-black dark:aria-selected:bg-zinc-800 dark:aria-selected:text-white',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" {...rest} />
          ) : (
            <ChevronRight className="h-4 w-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
