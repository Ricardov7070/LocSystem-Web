<?php

namespace App\Http\Requests\AdminUserManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdminUserUpdateRequest extends FormRequest
{
    public function authorize(): bool {
        return true;

    }


    public function rules(): array {

        return [
            'v_name' => 'required|string|min:3|max:255',
            'v_email' => 'required|string|email',
            'v_phone' => 'required|string|min:10|max:20',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}