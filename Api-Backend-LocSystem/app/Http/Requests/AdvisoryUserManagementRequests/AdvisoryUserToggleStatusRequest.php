<?php

namespace App\Http\Requests\AdvisoryUserManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdvisoryUserToggleStatusRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [
            'isActive' => 'required|boolean',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}
