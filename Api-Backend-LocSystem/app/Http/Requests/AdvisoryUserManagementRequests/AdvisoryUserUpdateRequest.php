<?php

namespace App\Http\Requests\AdvisoryUserManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdvisoryUserUpdateRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [
            'v_name' => 'required|string|min:3|max:255',
            'v_email' => 'required|string|email',
            'v_phone' => 'required|string|min:10|max:20',
            'legalAdvisoryIds' => 'required|array|min:1',
            'legalAdvisoryIds.*' => 'integer|exists:legal_advisories,i_id',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}
