<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Http\Services\UserService\UserServiceAuthentication;
use App\Http\Services\UserService\UserServiceValidation;
use App\Http\Requests\userManagementRequests\UserLoginRequest;
use App\Http\Requests\userManagementRequests\ForgotPasswordRequest;
use App\Http\Requests\userManagementRequests\UpdatePasswordRequest;
use Illuminate\Http\JsonResponse;
use App\Http\Services\EmailService\EmailService;    
use Illuminate\Http\Request; 


class UserAuthenticationController extends Controller {

    protected $serviceAuthentication;
    protected $serviceValidation;
    protected $serviceEmail;

    // Método Construtor
    public function __construct(UserServiceAuthentication $userServiceAuthentication, UserServiceValidation $userServiceValidation, EmailService $emailService) {
        $this->serviceAuthentication = $userServiceAuthentication;
        $this->serviceValidation = $userServiceValidation;
        $this->serviceEmail = $emailService;
    }


/**
 * @OA\Post(
 *     path="/api/auth/signin",
 *     summary="Realiza a autenticação do usuário.",
 *     tags={"Gerenciamento de Usuário"},
 *     @OA\Response(
 *         response=200,
 *         description="Login Realizado. Bem-Vindo!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Credenciais inválidas!"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Usuário Banido, entre em contato com o administrador do sistema!, Usuário Pendente de aprovação!, Assinatura do usuário expirada, entre em contato com o administrador do sistema!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Altere sua senha de acesso!"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação!"
 *     ),
 * )
 */
    public function userAuthentication (UserLoginRequest $request): JsonResponse {
        try {
                $data = $this->serviceAuthentication->authenticate(
                    $request->only('v_email'),
                    $request->only('v_password') 
                );

                return response()->json([
                    'success'      => 'Login realizado. Bem-Vindo ' . $data['user_name'] . '!',
                    'user'         => $data['user_name'],
                    'access_token' => $data['access_token'],
                    'token_type'   => 'Bearer',
                ], 200);

        } catch (HttpException $e) {

            return response()->json(['info' => $e->getMessage()], $e->getStatusCode());

        } catch (ValidationException $e) {

            return response()->json([
                'warning' => 'Erro de validação!',
                'errors'  => $e->errors(),
            ], 422);

        } catch (\Throwable $th) {
            
            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);
            
        }
    }


/**
 * @OA\Post(
 *     path="/api/logoutUser",
 *     summary="Realiza o logout do usuário atual autenticado",
 *     tags={"Gerenciamento de Usuário"},
 *     @OA\Response(
 *         response=200,
 *         description="Logout realizado com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Usuário Indefinido!"
 *     ),
 * )
 */
    public function logoutUser(): JsonResponse {
        try {

            if (!auth()->user()) {
                return response()->json(['message' => 'Usuário Indefinido!'], 401);
            }

            $this->serviceAuthentication->logout(auth()->user());

            return response()->json([
                'success' => 'Logout realizado com sucesso!',
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


/**
 * @OA\Post(
 *     path="/api/auth/forgotPassword",
 *     summary="Realiza o envio de uma senha aleatória via email para o usuário que esqueceu sua chave de acesso.",
 *     tags={"Gerenciamento de Usuário"},
 *     @OA\Response(
 *         response=200,
 *         description="Email enviado com sucesso! Verifique sua caixa de entrada para acessar sua nova senha!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Usuário não encontrado ou Desativado!"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação!"
 *     ),
 * )
 */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse {
        try {
   
            $user = $this->serviceValidation->validateUserForReset($request);

            $newPassword = $this->serviceAuthentication->resetAndGetTemporaryPassword($user->i_id);

            $this->serviceEmail->sendEmail(
                $user->v_email, 
                'Senha de Autenticação!', 
                'Olá ' . $request->input('v_name') . ', tudo bem? Sua senha temporária é: ' . $newPassword,
                null
            );

            return response()->json([
                'success' => 'Email enviado com sucesso! Verifique sua caixa de entrada para acessar sua nova senha!'
            ],200);

        } catch (HttpException $e) {

            return response()->json(['info' => $e->getMessage()], $e->getStatusCode());
       
        } catch (ValidationException $e) {

            return response()->json([
                'warning' => 'Erro de validação!',
                'errors'  => $e->errors(),
            ], 422);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!"
            ], 500);

        }
    }


/**
 * @OA\Post(
 *     path="/api/updatePassword",
 *     summary="Realiza a atualização da senha do usuário recuperado",
 *     tags={"Gerenciamento de Usuário"},
 *     @OA\Response(
 *         response=200,
 *         description="Senha atualizada com sucesso. Realize o login novamente!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação!"
 *     ),
 * )
 */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse {
        try {

            $this->serviceAuthentication->newPassword(
                $request->only('v_email'),
                $request->only('v_password') 
            );

            return response()->json([
                'success' => 'Senha atualizada com sucesso. Realize o login novamente!',
            ], 200);

        } catch (ValidationException $e) {

            return response()->json([
                'warning' => 'Erro de validação!',
                'errors'  => $e->errors(),
            ], 422);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }


/**
 * @OA\Post(
 *     path="/api/checkAuthenticationPerformed",
 *     summary="Verifica se a autenticação foi realizada com sucesso.",
 *     tags={"Gerenciamento de Usuário"},
 *     @OA\Response(
 *         response=200,
 *         description="Senha atualizada com sucesso. Realize o login novamente!"
 *     ),
 *    @OA\Response(
 *         response=401,
 *         description="Usuário não encontrado ou sem permissão de acesso!, Token de autenticação inválido ou expirado!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function checkAuthenticationPerformed(Request $request): JsonResponse {
        try {

            $this->serviceAuthentication->checkAuthentication($request->input('v_email'));

            return response()->json([
                'success' => 'Autenticação realizada com sucesso!',
            ], 200);

        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $th) {

            return response()->json(['info' => $th->getMessage(),], $th->getStatusCode());

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }   
    }

}