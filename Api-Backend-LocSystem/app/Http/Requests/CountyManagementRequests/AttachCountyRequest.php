<?php

namespace App\Http\Requests\CountyManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AttachCountyRequest extends FormRequest
{
    public function authorize(): bool {

        return true;

    }


    public function rules(): array {

        return [
            'v_name' => 'required|string|min:2|max:255',
            'v_state' => 'required|string|size:2',
            'b_is_primary' => 'nullable|boolean',
        ];

    }


    public function messages(): array {

        return [
            'v_name.required' => 'O nome da comarca é obrigatório.',
            'v_name.min' => 'O nome da comarca deve ter pelo menos 2 caracteres.',
            'v_state.required' => 'O estado é obrigatório.',
            'v_state.size' => 'O estado deve conter 2 caracteres.',
            'b_is_primary.boolean' => 'O campo de comarca principal deve ser verdadeiro ou falso.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
        
    }
}