<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Services\UserService\UserServiceTwoFactor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TwoFactorController extends Controller {

    protected $serviceTwoFactor;

    public function __construct(UserServiceTwoFactor $serviceTwoFactor) {
        $this->serviceTwoFactor = $serviceTwoFactor;
    }


    // Retorna se o 2FA está ativo para o usuário autenticado
    public function status(Request $request): JsonResponse {
        return response()->json([
            'twoFactorEnabled' => (bool) $request->user()->b_twoFactorEnabled,
        ], 200);
    }


    // Gera o secret e retorna a totpURI para exibição do QR Code
    public function enable(Request $request): JsonResponse {
        try {
            $request->validate(['password' => 'required|string']);

            $data = $this->serviceTwoFactor->enable($request->user(), $request->password);

            return response()->json($data, 200);

        } catch (HttpException $e) {
            return response()->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }


    // Verifica o código TOTP e conclui a ativação do 2FA
    public function verifyAndActivate(Request $request): JsonResponse {
        try {
            $request->validate(['code' => 'required|string|size:6']);

            $this->serviceTwoFactor->verifyAndActivate($request->user(), $request->code);

            return response()->json(['success' => 'Autenticação em duas etapas ativada com sucesso!'], 200);

        } catch (HttpException $e) {
            return response()->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }


    // Desativa o 2FA do usuário autenticado
    public function disable(Request $request): JsonResponse {
        try {
            $request->validate(['password' => 'required|string']);

            $this->serviceTwoFactor->disable($request->user(), $request->password);

            return response()->json(['success' => 'Autenticação em duas etapas desativada com sucesso!'], 200);

        } catch (HttpException $e) {
            return response()->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }


    // Recebe o preAuthToken + código TOTP e conclui o login emitindo o token definitivo
    public function verifyLogin(Request $request): JsonResponse {
        try {
            $request->validate([
                'preAuthToken' => 'required|string',
                'code'         => 'required|string|size:6',
            ]);

            $data = $this->serviceTwoFactor->verifyLoginCode($request->preAuthToken, $request->code);

            return response()->json([
                'success'          => 'Login realizado. Bem-Vindo ' . $data['user_name'] . '!',
                'user'             => $data['user_name'],
                'access_token'     => $data['access_token'],
                'token_type'       => 'Bearer',
                'role'             => $data['user_role'],
                'id'               => $data['user_id'],
                'email'            => $data['user_email'],
                'image'            => $data['user_image'],
                'phone'            => $data['user_phone'],
                'twoFactorEnabled' => true,
            ], 200);

        } catch (HttpException $e) {
            return response()->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }
}
