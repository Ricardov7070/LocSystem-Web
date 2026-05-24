'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';

interface LegalAdvisoryComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function LegalAdvisoryCombobox({
  value,
  onValueChange,
  placeholder = 'Selecione uma assessoria jurídica',
}: LegalAdvisoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: legalAdvisories = [] } = useQuery({
    queryKey: ['legal-advisories-options-combobox'],
    queryFn: async () => {
      const response = await api.get('/legalAdvisories/options');
      const items = response.data.legalAdvisory ?? response.data.data ?? [];
      return (items as any[]).map((item) => ({
        id: String(item.i_id),
        name: item.v_name,
        wallet: item.wallet ? { name: item.wallet.v_name } : null,
      }));
    },
  });

  const selectedAdvisory = legalAdvisories.find(
    (advisory) => advisory.id === value
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-10 w-full items-start justify-between gap-2 whitespace-normal py-2"
        >
          {selectedAdvisory ? (
            <div className="min-w-0 flex-1 whitespace-normal text-left">
              <div className="whitespace-normal break-words text-sm font-medium leading-5">{selectedAdvisory.name}</div>
              {selectedAdvisory.wallet && (
                <div className="whitespace-normal break-words text-xs text-muted-foreground">
                  Carteira: {selectedAdvisory.wallet.name}
                </div>
              )}
            </div>
          ) : (
            <span className="min-w-0 flex-1 truncate text-left">{placeholder}</span>
          )}
          <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar assessoria..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>Nenhuma assessoria encontrada.</CommandEmpty>
            <CommandGroup>
              {legalAdvisories.map((advisory) => (
                <CommandItem
                  key={advisory.id}
                  value={advisory.name}
                  className="items-start"
                  onSelect={() => {
                    onValueChange(advisory.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === advisory.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm leading-5">{advisory.name}</div>
                    {advisory.wallet ? (
                      <div className="break-words text-xs text-muted-foreground">
                        Carteira: {advisory.wallet.name}
                      </div>
                    ) : (
                      <div className="break-words text-xs text-muted-foreground">
                        Sem carteira definida
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
