<?php

namespace App\Http\Requests\userManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdatePasswordRequest extends FormRequest
{

    public function authorize (): bool {

        return true; 

    }


    public function rules (): array {

        return [
            'v_email' => 'required|string|email',
            'v_password' => 'required|string|min:8|max:16',
        ];

    }

    
    public function messages (): array {

        return [
            'v_email.required' => 'O campo de e-mail é obrigatório.',
            'v_email.email' => 'O e-mail fornecido é inválido.',
            'v_password.required' => 'O campo de senha é obrigatório.',
            'v_password.string' => 'O campo de senha deve ser uma string válida.',
            'v_password.min' => 'O campo de senha deve ter pelo menos 8 caracteres.',
            'v_password.max' => 'O campo de senha não pode exceder 16 caracteres.',
        ];

    }


    protected function failedValidation (Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    }  

}