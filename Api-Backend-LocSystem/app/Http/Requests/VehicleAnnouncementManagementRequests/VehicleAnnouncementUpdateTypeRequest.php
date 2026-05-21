<?php

namespace App\Http\Requests\VehicleAnnouncementManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class VehicleAnnouncementUpdateTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|string|in:JA_LOCALIZADO,CONTRATO_QUITADO,CONTRATO_SUBSTABELECIDO,VEICULO_NAO_APTO,VEICULO_APREENDIDO,BA_ANDAMENTO_POR_MIM,BA_ANDAMENTO_POR_TERCEIRO',
        ];
    }

    public function messages(): array
    {
        return [
            'type.required' => 'O tipo de comunicado é obrigatório.',
            'type.string' => 'O tipo de comunicado deve ser um texto.',
            'type.in' => 'Selecione um tipo de comunicado válido.',
        ];
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
    }
}