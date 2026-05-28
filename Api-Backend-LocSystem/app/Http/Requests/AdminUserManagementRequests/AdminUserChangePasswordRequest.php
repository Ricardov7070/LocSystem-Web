<?php

namespace App\Http\Requests\AdminUserManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdminUserChangePasswordRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [
            'v_password' => 'required|string|min:8|max:32',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}