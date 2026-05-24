<?php

namespace App\Http\Requests\DatabaseSyncManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class DatabaseSyncBulkTableMappingsRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array{

        return [
            'replace_existing' => ['nullable', 'boolean'],
            'table_mappings' => ['required', 'array', 'min:1'],
            'table_mappings.*.i_sync_order' => ['nullable', 'integer'],
            'table_mappings.*.v_source_table' => ['required', 'string', 'max:255'],
            'table_mappings.*.v_destination_table' => ['required', 'string', 'max:255'],
            'table_mappings.*.v_source_primary_key' => ['nullable', 'string', 'max:255'],
            'table_mappings.*.v_destination_primary_key' => ['nullable', 'string', 'max:255'],
            'table_mappings.*.b_destination_auto_increment' => ['nullable', 'boolean'],
            'table_mappings.*.b_truncate_before_sync' => ['nullable', 'boolean'],
            'table_mappings.*.v_conflict_strategy' => ['nullable', 'string', Rule::in(['insert', 'skip', 'upsert'])],
            'table_mappings.*.conflict_target_columns' => ['nullable', 'array', 'min:1'],
            'table_mappings.*.conflict_target_columns.*' => ['required', 'string', 'max:255'],
            'table_mappings.*.column_mappings' => ['required', 'array', 'min:1'],
            'table_mappings.*.column_mappings.*.mode' => ['nullable', 'string', Rule::in(['direct', 'relation', 'polymorphic_relation'])],
            'table_mappings.*.column_mappings.*.source_column' => ['required', 'string', 'max:255'],
            'table_mappings.*.column_mappings.*.destination_column' => ['required', 'string', 'max:255'],
            'table_mappings.*.column_mappings.*.reference_source_table' => ['nullable', 'string', 'max:255'],
            'table_mappings.*.column_mappings.*.source_type_column' => ['nullable', 'string', 'max:255'],
            'table_mappings.*.column_mappings.*.reference_source_table_by_type' => ['nullable', 'array'],
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}