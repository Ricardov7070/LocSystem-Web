<?php

namespace App\Http\Requests\CameraMonitoring;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class SaveIncidenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'plate'      => 'required|string|max:20',
            'latitude'   => 'nullable|numeric',
            'longitude'  => 'nullable|numeric',
            'confidence' => 'nullable|numeric|min:0|max:1',
            'image'      => 'nullable|file|mimes:jpg,jpeg,png|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'plate.required'      => 'A placa é obrigatória.',
            'plate.string'        => 'A placa deve ser um texto.',
            'plate.max'           => 'A placa deve ter no máximo 20 caracteres.',
            'latitude.numeric'    => 'A latitude deve ser um número.',
            'longitude.numeric'   => 'A longitude deve ser um número.',
            'confidence.numeric'  => 'O campo de confiança deve ser um número.',
            'confidence.min'      => 'O valor de confiança deve ser no mínimo 0.',
            'confidence.max'      => 'O valor de confiança deve ser no máximo 1.',
            'image.file'          => 'A imagem deve ser um arquivo.',
            'image.mimes'         => 'A imagem deve ser do tipo jpg, jpeg ou png.',
            'image.max'           => 'A imagem deve ter no máximo 5MB.',
        ];
    }

    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    } 
}
