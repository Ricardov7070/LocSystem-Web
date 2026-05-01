<?php

namespace App\Http\Requests\userManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class ForgotPasswordRequest extends FormRequest
{

    public function authorize (): bool {

        return true; 

    }


    public function rules (): array {

        return [
            'v_email' => 'required|string|email',
            'v_name' => 'required|string|min:3|max:255',
        ];

    }

    
    public function messages (): array {

        return [
            'v_email.required' => 'O campo de e-mail é obrigatório.',
            'v_email.email' => 'O e-mail fornecido é inválido.',
            'v_name.required' => 'O campo de nome é obrigatório.',
            'v_name.string' => 'O campo de nome deve ser uma string válida.',
            'v_name.min' => 'O campo de nome deve ter pelo menos 3 caracteres.',
            'v_name.max' => 'O campo de nome não pode exceder 255 caracteres.',
        ];

    }


    protected function failedValidation (Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    }  

}