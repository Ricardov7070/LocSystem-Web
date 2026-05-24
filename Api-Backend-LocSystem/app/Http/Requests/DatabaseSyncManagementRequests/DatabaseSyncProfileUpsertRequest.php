<?php

namespace App\Http\Requests\DatabaseSyncManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class DatabaseSyncProfileUpsertRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        $destinationRequired = Rule::requiredIf(fn () => !$this->boolean('b_use_default_destination', true));

        return [
            'v_name' => ['required', 'string', 'max:255'],
            'b_use_default_destination' => ['nullable', 'boolean'],
            'source' => ['required', 'array'],
            'source.driver' => ['required', 'string', Rule::in(['mysql', 'pgsql', 'sqlsrv'])],
            'source.host' => ['required', 'string', 'max:255'],
            'source.port' => ['nullable', 'integer'],
            'source.database' => ['required', 'string', 'max:255'],
            'source.username' => ['required', 'string', 'max:255'],
            'source.password' => [$this->isMethod('post') ? 'required' : 'nullable', 'string'],
            'destination' => [$destinationRequired, 'array'],
            'destination.driver' => [$destinationRequired, 'string', Rule::in(['mysql', 'pgsql', 'sqlsrv'])],
            'destination.host' => [$destinationRequired, 'string', 'max:255'],
            'destination.port' => ['nullable', 'integer'],
            'destination.database' => [$destinationRequired, 'string', 'max:255'],
            'destination.username' => [$destinationRequired, 'string', 'max:255'],
            'destination.password' => [$this->isMethod('post') ? $destinationRequired : 'nullable', 'string'],
        ];

    }


    public function messages(): array {

        return [
            'v_name.required' => 'O nome do perfil é obrigatório.',
            'source.required' => 'A configuração do banco remetente é obrigatória.',
            'source.driver.in' => 'O driver do banco remetente precisa ser mysql, pgsql ou sqlsrv.',
            'destination.required' => 'A configuração do banco destinatário é obrigatória quando a conexão padrão não for utilizada.',
            'destination.driver.in' => 'O driver do banco destinatário precisa ser mysql, pgsql ou sqlsrv.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}