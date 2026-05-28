<?php

namespace App\Http\Requests\AdminUserManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdminUserToggleStatusRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [
            'isActive' => 'required|boolean',
            'reason' => 'nullable|string|max:1000',
        ];

    }


    public function messages(): array {

        return [
            'isActive.required' => 'O status desejado é obrigatório.',
            'isActive.boolean' => 'O status desejado deve ser verdadeiro ou falso.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}