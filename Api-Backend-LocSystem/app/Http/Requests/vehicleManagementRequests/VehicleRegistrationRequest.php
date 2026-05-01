<?php

namespace App\Http\Requests\vehicleManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class VehicleRegistrationRequest extends FormRequest
{

    public function authorize (): bool {

        return true; 

    }


    public function rules (): array {

        return [
            'v_plate' => 'required|string|max:20',
            'v_plate_mercosul' => 'required|string|max:20',
            'v_model' => 'required|string|max:20',
            'v_phone' => 'required|string|max:11|regex:/^[0-9]+$/',
            'i_legal_advisory_access_id' => 'required|int|max:14',
        ];

    }

    
    public function messages (): array {

        return [
            'v_plate.required' => 'O campo de placa é obrigatório.',
            'v_plate.string' => 'O campo de placa deve ser uma string válida.',
            'v_plate.max' => 'O campo de placa não pode exceder 20 caracteres.',
            'v_plate_mercosul.required' => 'O campo de placa Mercosul é obrigatório.',
            'v_plate_mercosul.string' => 'O campo de placa Mercosul deve ser uma string válida.',
            'v_plate_mercosul.max' => 'O campo de placa Mercosul não pode exceder 20 caracteres.',
            'v_model.required' => 'O campo de modelo é obrigatório.',
            'v_model.string' => 'O campo de modelo deve ser uma string válida.',
            'v_model.max' => 'O campo de modelo não pode exceder 20 caracteres.',
            'v_phone.required' => 'O campo de telefone é obrigatório.',
            'v_phone.max' => 'O campo de telefone não pode exceder 11 caracteres.',
            'v_phone.regex' => 'O campo de telefone deve conter apenas números.',
            'i_legal_advisory_access_id.required' => 'O campo de ID de acesso ao assessor jurídico é obrigatório.',
            'i_legal_advisory_access_id.int' => 'O campo de ID de acesso ao assessor jurídico deve ser um número inteiro.',
            'i_legal_advisory_access_id.max' => 'O campo de ID de acesso ao assessor jurídico não pode exceder 14 caracteres.',
        ];

    }


    protected function failedValidation (Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    }  

}