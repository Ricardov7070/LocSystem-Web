<?php

namespace App\Support;

use RuntimeException;

class DatabaseSyncPayloadBuilder
{
    public function build(
        array $sourceRow,
        array $columnMappings,
        array $resolvedIdsBySourceTable,
        ?callable $relationResolver = null,
    ): array
    {
        $payload = [];

        foreach ($columnMappings as $mapping) {
            $mode = $mapping['mode'] ?? 'direct';
            $destinationColumn = (string) ($mapping['destination_column'] ?? '');
            $sourceColumn = (string) ($mapping['source_column'] ?? '');

            if ($destinationColumn === '' || $sourceColumn === '') {
                throw new RuntimeException('Cada mapeamento precisa informar source_column e destination_column.');
            }

            $value = $sourceRow[$sourceColumn] ?? null;

            if ($mode === 'relation') {
                if ($value === null || $value === '') {
                    $payload[$destinationColumn] = null;
                    continue;
                }

                $referenceSourceTable = (string) ($mapping['reference_source_table'] ?? '');
                if ($referenceSourceTable === '') {
                    throw new RuntimeException("O mapeamento relacional da coluna {$destinationColumn} precisa informar reference_source_table.");
                }

                $resolvedId = $relationResolver !== null
                    ? $relationResolver($referenceSourceTable, (string) $value)
                    : ($resolvedIdsBySourceTable[$referenceSourceTable][(string) $value] ?? null);
                if ($resolvedId === null) {
                    throw new RuntimeException("Não foi possível resolver o relacionamento da tabela {$referenceSourceTable} para o valor {$value}.");
                }

                $payload[$destinationColumn] = $resolvedId;
                continue;
            }

            $payload[$destinationColumn] = $value;
        }

        return $payload;
    }
}