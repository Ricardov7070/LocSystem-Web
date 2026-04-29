'use client';

import { HTMLAttributes, ReactNode, useCallback } from 'react';
import { Accept, useDropzone } from 'react-dropzone';

import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

interface DropzoneProps extends HTMLAttributes<HTMLDivElement> {
  onFiles?: (acceptedFiles: File[]) => void;
  icon?: ReactNode;
  name: string;
  label?: string;
  text?: ReactNode;
  draggingText?: ReactNode;
  multiple?: boolean;
  accept?: Accept;
  disabled?: boolean;
}

const Child = ({ children }: { children: ReactNode }) =>
  typeof children === 'string' ? <p>{children}</p> : children;

export function Dropzone({
  onFiles,
  label,
  name,
  draggingText = 'Solte os arquivos',
  text = 'Arraste e solte os arquivos aqui, ou clique para selecionar',
  accept,
  multiple,
  className,
  disabled,
  icon,
  ...rest
}: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFiles?.(acceptedFiles);
    },
    [onFiles]
  );

  const {
    acceptedFiles,
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    multiple,
    accept,
  });

  return (
    <div className="w-full">
      {label && <Label htmlFor={name}>{label}</Label>}
      <div
        {...getRootProps()}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center rounded-md border border-dashed border-input bg-transparent px-3 py-3 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          isDragActive && 'border-primary',
          isDragReject && 'border-red-500',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        {...rest}
      >
        <input {...getInputProps()} />

        {icon && <div className="mr-2">{icon}</div>}

        {acceptedFiles.length > 0 ? (
          <p>{acceptedFiles.map((file) => file.name).join(', ')}</p>
        ) : isDragReject ? (
          <p>Inválido!</p>
        ) : isDragActive ? (
          <Child>{draggingText}</Child>
        ) : (
          <Child>{text}</Child>
        )}
      </div>
    </div>
  );
}
