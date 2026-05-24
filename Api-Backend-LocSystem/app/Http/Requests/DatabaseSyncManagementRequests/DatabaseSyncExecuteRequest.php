<?php

namespace App\Http\Requests\DatabaseSyncManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class DatabaseSyncExecuteRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));

    }
}