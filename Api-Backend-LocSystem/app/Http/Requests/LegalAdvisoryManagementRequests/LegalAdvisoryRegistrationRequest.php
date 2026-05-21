<?php

namespace App\Http\Requests\LegalAdvisoryManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class LegalAdvisoryRegistrationRequest extends FormRequest
{
    public function authorize(): bool {    

        return true;

    }

    
    public function rules(): array {

        return [
            'v_name' => 'required|string|min:4|max:100',
            'v_document' => 'required|string|min:11|max:20',
            'v_phone' => 'required|string|min:10|max:20',
            'i_wallet_id' => 'required|integer|exists:wallets,i_id',
        ];

    }
    

    public function messages(): array{

        return [
            'v_name.required' => 'O campo de nome é obrigatório.',
            'v_name.min' => 'O campo de nome deve ter no mínimo 4 caracteres.',
            'v_name.max' => 'O campo de nome não pode exceder 100 caracteres.',
            'v_document.required' => 'O campo de documento é obrigatório.',
            'v_document.min' => 'O campo de documento deve ter no mínimo 11 caracteres.',
            'v_document.max' => 'O campo de documento não pode exceder 20 caracteres.',
            'v_phone.required' => 'O campo de telefone é obrigatório.',
            'v_phone.min' => 'O campo de telefone deve ter no mínimo 10 caracteres.',
            'v_phone.max' => 'O campo de telefone não pode exceder 20 caracteres.',
            'i_wallet_id.required' => 'O campo de carteira é obrigatório.',
            'i_wallet_id.integer' => 'O campo de carteira deve ser numérico.',
            'i_wallet_id.exists' => 'A carteira selecionada não foi encontrada.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}
