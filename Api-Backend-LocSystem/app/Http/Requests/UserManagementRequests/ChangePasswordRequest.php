<?php

namespace App\Http\Requests\UserManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class ChangePasswordRequest extends FormRequest
{

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => 'required|string|min:1|max:16',
            'new_password'     => 'required|string|min:8|max:16',
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'O campo de senha atual é obrigatório.',
            'current_password.max'      => 'A senha atual não pode exceder 16 caracteres.',
            'new_password.required'     => 'O campo de nova senha é obrigatório.',
            'new_password.min'          => 'A nova senha deve ter pelo menos 8 caracteres.',
            'new_password.max'          => 'A nova senha não pode exceder 16 caracteres.',
        ];
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
    }
}
