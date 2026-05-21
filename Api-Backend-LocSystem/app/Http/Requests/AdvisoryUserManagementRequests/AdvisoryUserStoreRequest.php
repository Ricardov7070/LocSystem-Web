<?php

namespace App\Http\Requests\AdvisoryUserManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdvisoryUserStoreRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [
            'v_name' => 'required|string|min:3|max:255',
            'v_email' => 'required|string|email',
            'v_phone' => 'required|string|min:10|max:20',
            'v_password' => 'required|string|min:8|max:32',
            'legalAdvisoryIds' => 'required|array|min:1',
            'legalAdvisoryIds.*' => 'integer|exists:legal_advisories,i_id',
        ];

    }


    public function messages(): array {

        return [
            'v_name.required' => 'O campo de nome é obrigatório.',
            'v_email.required' => 'O campo de e-mail é obrigatório.',
            'v_email.email' => 'O e-mail informado é inválido.',
            'v_phone.required' => 'O campo de telefone é obrigatório.',
            'v_password.required' => 'O campo de senha é obrigatório.',
            'v_password.min' => 'A senha deve ter no mínimo 8 caracteres.',
            'legalAdvisoryIds.required' => 'Selecione ao menos uma assessoria.',
            'legalAdvisoryIds.array' => 'O campo de assessorias deve ser uma lista.',
            'legalAdvisoryIds.min' => 'Selecione ao menos uma assessoria.',
            'legalAdvisoryIds.*.exists' => 'Uma ou mais assessorias selecionadas não foram encontradas.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}
