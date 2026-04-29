import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number) {
  return format(new Date(date), 'dd/MM/yyyy HH:mm');
}

export function formatDateBrazil(date: Date | string | number) {
  const value = date instanceof Date ? date : date ? new Date(date) : undefined;

  if (!value || Number.isNaN(value.getTime())) {
    return '';
  }

  return value.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
