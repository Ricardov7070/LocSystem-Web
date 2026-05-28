<?php

namespace App\Http\Requests\OperatorManagementRequests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class MyDeputyStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }


    public function rules(): array
    {
        return [
            'v_name' => 'required|string|min:3|max:255',
            'v_email' => 'required|string|email|max:255',
            'v_phone' => 'required|string|max:11|regex:/^[0-9]+$/',
            'v_password' => 'required|string|min:8|max:16',
        ];
    }


    public function messages(): array
    {
        return [
            'v_name.required' => 'O campo de nome é obrigatório.',
            'v_name.min' => 'O campo de nome deve ter pelo menos 3 caracteres.',
            'v_name.max' => 'O campo de nome não pode exceder 255 caracteres.',
            'v_email.required' => 'O campo de e-mail é obrigatório.',
            'v_email.email' => 'O e-mail fornecido é inválido.',
            'v_email.max' => 'O campo de e-mail não pode exceder 255 caracteres.',
            'v_phone.required' => 'O campo de telefone é obrigatório.',
            'v_phone.max' => 'O campo de telefone não pode exceder 11 caracteres.',
            'v_phone.regex' => 'O campo de telefone deve conter apenas números.',
            'v_password.required' => 'O campo de senha é obrigatório.',
            'v_password.min' => 'O campo de senha deve ter pelo menos 8 caracteres.',
            'v_password.max' => 'O campo de senha não pode exceder 16 caracteres.',
        ];
    }


    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors(),
        ], 422));
    }
}