'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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

interface LegalAdvisoryMultiSelectComboboxProps {
  value?: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
}

export function LegalAdvisoryMultiSelectCombobox({
  value = [],
  onValueChange,
  placeholder = 'Selecione assessorias jurídicas',
}: LegalAdvisoryMultiSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Buscar assessorias via API quando endpoint estiver disponível
  const legalAdvisories: { id: string; name: string; wallet: { name: string } | null }[] = [];

  const selectedAdvisories = legalAdvisories.filter((advisory) =>
    value.includes(advisory.id)
  );

  const handleSelect = (advisoryId: string) => {
    if (value.includes(advisoryId)) {
      onValueChange(value.filter((id) => id !== advisoryId));
    } else {
      onValueChange([...value, advisoryId]);
    }
  };

  const handleRemove = (advisoryId: string) => {
    onValueChange(value.filter((id) => id !== advisoryId));
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-10 w-full justify-between py-2"
          >
            <div className="flex flex-1 flex-wrap gap-1">
              {selectedAdvisories.length > 0 ? (
                selectedAdvisories.map((advisory) => (
                  <Badge
                    key={advisory.id}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    <span className="text-xs">{advisory.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 cursor-pointer rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemove(advisory.id);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(advisory.id);
                      }}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
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
                {legalAdvisories.map((advisory) => {
                  const isSelected = value.includes(advisory.id);
                  return (
                    <CommandItem
                      key={advisory.id}
                      value={advisory.name}
                      onSelect={() => handleSelect(advisory.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-1 flex-col">
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
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
