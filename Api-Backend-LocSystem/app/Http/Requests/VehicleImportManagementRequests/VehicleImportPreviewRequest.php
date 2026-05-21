<?php

namespace App\Http\Requests\VehicleImportManagementRequests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class VehicleImportPreviewRequest extends FormRequest
{
    public function authorize(): bool {

        return true;
        
    }


    public function rules(): array {

        return [
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ];

    }

    
    public function messages(): array {

        return [
            'file.required' => 'O arquivo é obrigatório.',
            'file.file' => 'O campo deve ser um arquivo válido.',
            'file.mimes' => 'O arquivo deve ser do tipo xlsx, xls ou csv.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    }
}
