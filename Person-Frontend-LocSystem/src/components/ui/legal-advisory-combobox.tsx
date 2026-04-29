'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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

  // TODO: Buscar assessorias via API quando endpoint estiver disponível
  const legalAdvisories: { id: string; name: string; wallet: { name: string } | null }[] = [];

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
          className="h-auto min-h-10 w-full justify-between py-2"
        >
          {selectedAdvisory ? (
            <div className="flex flex-col items-start">
              <span>{selectedAdvisory.name}</span>
              {selectedAdvisory.wallet && (
                <span className="text-xs text-muted-foreground">
                  Carteira: {selectedAdvisory.wallet.name}
                </span>
              )}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                  <div className="flex flex-col">
                    <span>{advisory.name}</span>
                    {advisory.wallet ? (
                      <span className="text-xs text-muted-foreground">
                        Carteira: {advisory.wallet.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sem carteira definida
                      </span>
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
