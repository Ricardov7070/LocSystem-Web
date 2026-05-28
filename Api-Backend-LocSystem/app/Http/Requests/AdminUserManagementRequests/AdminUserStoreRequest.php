<?php

namespace App\Http\Requests\AdminUserManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdminUserStoreRequest extends FormRequest
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
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}