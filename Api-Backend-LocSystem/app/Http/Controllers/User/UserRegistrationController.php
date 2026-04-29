<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Http\Services\UserService\UserServiceAuthentication;
use App\Http\Services\UserService\UserServiceValidation;
use App\Http\Services\UserService\UserServiceRegistration;
use App\Http\Requests\userManagementRequests\UserRegisterRequest;
use App\Http\Requests\userManagementRequests\UserUpdateRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request; 


class UserRegistrationController extends Controller {

    protected $serviceRegistration;
    protected $serviceValidation;
    protected $serviceAuthentication;

    public function __construct(UserServiceRegistration $userServiceRegistration, UserServiceValidation $userServiceValidation, UserServiceAuthentication $userServiceAuthentication) {
        $this->serviceRegistration = $userServiceRegistration;
        $this->serviceValidation = $userServiceValidation;
        $this->serviceAuthentication = $userServiceAuthentication;
    }


/**
 * @OA\Post(
 *     path="/api/auth/signup",
 *     summary="Realiza o registro do usuário.",
 *     tags={"Gerenciamento de Usuário"},
 *     @OA\Response(
 *         response=201,
 *         description="Registro realizado com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Usuário já cadastrado!, Email já cadastrado com outro usuário!"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação!"
 *     ),
 * )
 */
    public function registerUsers(UserRegisterRequest $request): JsonResponse {
        try {

            $this->serviceValidation->checkUserRegistration($request);

            $user = $this->serviceRegistration->createUser($request);

            return response()->json([
                'success' => 'Registro realizado com sucesso!',
                'user' => $user
            ], 201);

        } catch (HttpException $e) {

            return response()->json(['info' => $e->getMessage()], $e->getStatusCode());

        } catch (ValidationException $e) {

            return response()->json([
                'warning' => 'Erro de validação!',
                'errors'  => $e->errors(),
            ], 422);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }
    }


/**
 * @OA\Put(
 *     path="/api/updateUser/{id_user}",
 *     summary="Realiza a atualização de dados cadastrais do usuário registrado.",
 *     tags={"Gerenciamento de Usuário"},
 *     @OA\Response(
 *         response=200,
 *         description="Atualização realizada com sucesso. Faça login novamente!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Usuário já cadastrado!, Email já cadastrado com outro usuário!"
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
    public function updateRecord(UserUpdateRequest $request, $id): JsonResponse  {
        try {
            
            $this->serviceValidation->searchUser($id);

            $this->serviceValidation->checkUserRegistration($request, $id);

            $updatedUser = $this->serviceRegistration->updateUser($request, $id);

            $this->serviceAuthentication->logout($id);

            return response()->json([
                'success' => 'Atualização realizada com sucesso. Faça login novamente!',
                'user' => $updatedUser
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
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }
    }


/**
 * @OA\Delete(
 *     path="/api/deleteUser/{id_user}",
 *     summary="Realiza a exclusão do usuário selecionado do banco de dados",
 *     tags={"Gerenciamento de Usuário"},
 *     @OA\Response(
 *         response=200,
 *         description="Excluído com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Usuário não encontrado ou Desativado!"
 *     ),
 * )
 */
    public function deleteRecord(Request $request): JsonResponse {
        try {

            $this->serviceValidation->searchUser($request->id);

            $deletedUser = $this->serviceRegistration->deleteUser($request->id);

            $this->serviceAuthentication->logout($request->id);

            return response()->json([
                'success' => 'Excluído com sucesso!',
                'user' => $deletedUser,
                'status' => 'Deletado.'
            ], 200); 

        } catch (HttpException $e) {
   
            return response()->json(['info' => $e->getMessage()], $e->getStatusCode());

        } catch (\Throwable $th) {
  
            return response()->json([
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }
    }

}