<?php

namespace App\Http\Requests\PricingPlanManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class PricingPlanRegistrationRequest extends FormRequest
{

    public function authorize(): bool {

        return true; 

    }


    public function rules(): array {

        return [
            'v_name' => 'required|string|max:20',
            'f_operator_price' => 'required|numeric|decimal:0,2|min:0|max:99999.99',
            'f_preposto_price' => 'required|numeric|decimal:0,2|min:0|max:99999.99',
            'b_is_active' => 'required|boolean',
        ];

    }

    
    public function messages(): array {

        return [
            'v_name.required' => 'O campo de nome é obrigatório.',
            'v_name.string' => 'O campo de nome deve ser uma string válida.',
            'v_name.max' => 'O campo de nome não pode exceder 20 caracteres.',
            'f_operator_price.required' => 'O campo de preço do operador é obrigatório.',
            'f_operator_price.numeric' => 'O campo de preço do operador deve ser um número.',
            'f_operator_price.decimal' => 'O campo de preço do operador deve ter no máximo 2 casas decimais.',
            'f_operator_price.max' => 'O campo de preço do operador deve ser no máximo 99999.99 caracteres.',
            'f_operator_price.min' => 'O campo de preço do operador deve ser no mínimo 0.',
            'f_preposto_price.required' => 'O campo de preço do preposto é obrigatório.',
            'f_preposto_price.numeric' => 'O campo de preço do preposto deve ser um número.',
            'f_preposto_price.decimal' => 'O campo de preço do preposto deve ter no máximo 2 casas decimais.',
            'f_preposto_price.max' => 'O campo de preço do preposto deve ser no máximo 99999.99 caracteres.',
            'f_preposto_price.min' => 'O campo de preço do preposto deve ser no mínimo 0.',
            'b_is_active.required' => 'O campo de status é obrigatório.',
            'b_is_active.boolean' => 'O campo de status deve ser verdadeiro ou falso.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    }  

}