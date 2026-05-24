<?php

namespace App\Http\Requests\DatabaseSyncManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class DatabaseSyncTableMappingUpsertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'i_sync_order' => ['nullable', 'integer'],
            'v_source_table' => ['required', 'string', 'max:255'],
            'v_destination_table' => ['required', 'string', 'max:255'],
            'v_source_primary_key' => ['nullable', 'string', 'max:255'],
            'v_destination_primary_key' => ['nullable', 'string', 'max:255'],
            'b_destination_auto_increment' => ['nullable', 'boolean'],
            'b_truncate_before_sync' => ['nullable', 'boolean'],
            'v_conflict_strategy' => ['nullable', 'string', Rule::in(['insert', 'skip', 'upsert'])],
            'conflict_target_columns' => ['nullable', 'array', 'min:1'],
            'conflict_target_columns.*' => ['required', 'string', 'max:255'],
            'column_mappings' => ['required', 'array', 'min:1'],
            'column_mappings.*.mode' => ['nullable', 'string', Rule::in(['direct', 'relation', 'polymorphic_relation'])],
            'column_mappings.*.source_column' => ['required', 'string', 'max:255'],
            'column_mappings.*.destination_column' => ['required', 'string', 'max:255'],
            'column_mappings.*.reference_source_table' => ['nullable', 'string', 'max:255'],
            'column_mappings.*.source_type_column' => ['nullable', 'string', 'max:255'],
            'column_mappings.*.reference_source_table_by_type' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'v_source_table.required' => 'A tabela de origem é obrigatória.',
            'v_destination_table.required' => 'A tabela de destino é obrigatória.',
            'column_mappings.required' => 'Informe ao menos um mapeamento de colunas.',
            'v_conflict_strategy.in' => 'A estratégia de conflito precisa ser insert, skip ou upsert.',
            'column_mappings.*.mode.in' => 'O modo do mapeamento precisa ser direct, relation ou polymorphic_relation.',
            'column_mappings.*.source_column.required' => 'Toda linha do mapeamento precisa informar a coluna de origem.',
            'column_mappings.*.destination_column.required' => 'Toda linha do mapeamento precisa informar a coluna de destino.',
        ];
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
    }
}