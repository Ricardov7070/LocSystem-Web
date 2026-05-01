<?php

namespace App\Http\Requests\walletManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class WalletRegistrationRequest extends FormRequest
{

    public function authorize (): bool {

        return true; 

    }


    public function rules (): array {

        return [
            'v_name' => 'required|string|max:20',
        ];

    }

    
    public function messages (): array {

        return [
            'v_name.required' => 'O campo de nome é obrigatório.',
            'v_name.string' => 'O campo de nome deve ser uma string válida.',
            'v_name.max' => 'O campo de nome não pode exceder 20 caracteres.',
        ];

    }


    protected function failedValidation (Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    }  

}