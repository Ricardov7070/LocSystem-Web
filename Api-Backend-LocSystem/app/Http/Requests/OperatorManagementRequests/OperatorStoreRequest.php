<?php

namespace App\Http\Requests\OperatorManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class OperatorStoreRequest extends FormRequest
{
    public function authorize(): bool {
        return true;

    }


    public function rules(): array {

        return [
            'v_name' => 'required|string|min:3|max:255',
            'v_email' => 'required|string|email|max:255',
            'v_password' => 'required|string|min:8|max:64',
            'v_document' => 'required|string|size:14|regex:/^[0-9]+$/',
            'v_phone' => 'required|string|min:10|max:11|regex:/^[0-9]+$/',
            'i_user_limit' => 'nullable|integer|min:0',
            'b_is_courtesy' => 'nullable|boolean',
            'i_pricing_plan_id' => [
                Rule::requiredIf(fn() => !$this->boolean('b_is_courtesy')),
                'nullable',
                'integer',
                'min:1',
            ],
        ];

    }


    public function messages(): array {

        return [
            'v_name.required' => 'O campo de nome é obrigatório.',
            'v_email.required' => 'O campo de e-mail é obrigatório.',
            'v_email.email' => 'O e-mail fornecido é inválido.',
            'v_password.required' => 'O campo de senha é obrigatório.',
            'v_password.min' => 'A senha deve ter pelo menos 8 caracteres.',
            'v_document.required' => 'O campo de documento é obrigatório.',
            'v_document.size' => 'O documento deve conter 14 números.',
            'v_document.regex' => 'O documento deve conter apenas números.',
            'v_phone.required' => 'O campo de telefone é obrigatório.',
            'v_phone.regex' => 'O telefone deve conter apenas números.',
            'i_user_limit.integer' => 'O limite de prepostos deve ser numérico.',
            'i_pricing_plan_id.required' => 'O plano de precificação é obrigatório para mensalistas.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}