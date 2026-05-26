<?php

namespace App\Http\Requests\OperatorManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class OperatorChangePasswordRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [
            'v_password' => 'required|string|min:8|max:64',
        ];

    }


    public function messages(): array {

        return [
            'v_password.required' => 'A nova senha é obrigatória.',
            'v_password.min' => 'A nova senha deve ter pelo menos 8 caracteres.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}