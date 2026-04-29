<?php

namespace App\Http\Requests\userManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UserRegisterRequest extends FormRequest
{

    public function authorize (): bool {

        return true; 

    }


    public function rules (): array {

        return [
            'v_email' => 'required|string|email',
            'v_name' => 'required|string|min:3|max:255',
            'v_password' => 'required|string|min:8|max:16',
            'v_document' => 'required|string|max:14',
            'v_phone' => 'required|string|max:11|regex:/^[0-9]+$/',
            'e_role' => 'required|string|in:ADMIN,OPERATOR,AUDITOR,OLHEIRO,LINKED_USER',
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
            'v_password.required' => 'O campo de senha é obrigatório.',
            'v_password.string' => 'O campo de senha deve ser uma string válida.',
            'v_password.min' => 'O campo de senha deve ter pelo menos 8 caracteres.',
            'v_password.max' => 'O campo de senha não pode exceder 16 caracteres.',
            'v_document.required' => 'O campo de documento é obrigatório.',
            'v_document.max' => 'O campo de documento não pode exceder 14 caracteres.',
            'v_phone.required' => 'O campo de telefone é obrigatório.',
            'v_phone.max' => 'O campo de telefone não pode exceder 11 caracteres.',
            'v_phone.regex' => 'O campo de telefone deve conter apenas números.',
            'e_role.required' => 'O campo de função é obrigatório.',
            'e_role.in' => 'O campo precisa ser uma opção válida.',
        ];

    }


    protected function failedValidation (Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    }  

}