<?php

namespace App\Http\Requests\AdvisoryUserManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdvisoryUserRenewSubscriptionRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [
            'd_subscription_expires_at' => 'required|date',
        ];

    }


    public function messages(): array {

        return [
            'd_subscription_expires_at.required' => 'A data de vencimento é obrigatória.',
            'd_subscription_expires_at.date' => 'A data de vencimento é inválida.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));

    }
}