'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import {
  Button,
  Group,
  Input,
  Label,
  NumberField,
} from 'react-aria-components';

import { cn } from '../../lib/utils';

interface NumberInputProps {
  value?: number;
  onChange?: (value: number) => void;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  description?: string;
  className?: string;
  id?: string;
}

export function NumberInput({
  value,
  onChange,
  defaultValue = 0,
  minValue = 0,
  maxValue = 999,
  step = 1,
  disabled = false,
  label,
  placeholder,
  description,
  className,
  id,
  ...props
}: NumberInputProps) {
  return (
    <NumberField
      value={value}
      onChange={onChange}
      defaultValue={defaultValue}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      isDisabled={disabled}
      id={id}
      className={cn('w-full', className)}
      {...props}
    >
      <div className="flex flex-col space-y-2">
        {label && (
          <Label className="text-sm font-medium text-foreground">{label}</Label>
        )}
        <Group className="data-focus-within:border-ring data-focus-within:ring-ring/50 data-focus-within:has-aria-invalid:ring-destructive/20 dark:data-focus-within:has-aria-invalid:ring-destructive/40 data-focus-within:has-aria-invalid:border-destructive shadow-xs data-disabled:opacity-50 data-focus-within:ring-[3px] relative inline-flex h-9 w-fit items-center overflow-hidden whitespace-nowrap rounded-md border border-input text-sm outline-none transition-[color,box-shadow]">
          <Button
            slot="decrement"
            className="-ms-px flex aspect-square h-[inherit] items-center justify-center rounded-s-md border border-input bg-background text-sm text-muted-foreground/80 transition-[color,box-shadow] hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MinusIcon size={16} aria-hidden="true" />
          </Button>
          <Input
            placeholder={placeholder}
            className="w-12 border-0 bg-background px-1 py-2 text-center tabular-nums text-foreground shadow-none outline-none [appearance:textfield] focus:border-0 focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button
            slot="increment"
            className="-me-px flex aspect-square h-[inherit] items-center justify-center rounded-e-md border border-input bg-background text-sm text-muted-foreground/80 transition-[color,box-shadow] hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon size={16} aria-hidden="true" />
          </Button>
        </Group>
        {description && (
          <p
            className="text-xs text-muted-foreground"
            role="region"
            aria-live="polite"
          >
            {description}
          </p>
        )}
      </div>
    </NumberField>
  );
}
