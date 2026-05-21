<?php

namespace App\Http\Requests\CameraMonitoring;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class SaveConfigRequest extends FormRequest
{
    public function authorize(): bool {

        return true;
        
    }


    public function rules(): array {

        return [
            'v_host'     => 'required|string|max:255',
            'v_username' => 'required|string|max:255',
            'v_password' => 'required|string|max:255',
            'i_channel'  => 'nullable|integer|min:1|max:16',
            'b_enabled'  => 'nullable|boolean',
        ];

    }


    public function messages(): array {

        return [
            'v_host.required'     => 'O host é obrigatório.',
            'v_host.string'       => 'O host deve ser um texto.',
            'v_host.max'          => 'O host deve ter no máximo 255 caracteres.',
            'v_username.required' => 'O usuário é obrigatório.',
            'v_username.string'   => 'O usuário deve ser um texto.',
            'v_username.max'      => 'O usuário deve ter no máximo 255 caracteres.',
            'v_password.required' => 'A senha é obrigatória.',
            'v_password.string'   => 'A senha deve ser um texto.',
            'v_password.max'      => 'A senha deve ter no máximo 255 caracteres.',
            'i_channel.integer'   => 'O canal deve ser um número inteiro.',
            'i_channel.min'       => 'O canal deve ser no mínimo 1.',
            'i_channel.max'       => 'O canal deve ser no máximo 16.',
            'b_enabled.boolean'   => 'O campo "habilitado" deve ser verdadeiro ou falso.',
        ];

    }


    protected function failedValidation(Validator $validator): never {

        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ],422));

    } 
}
