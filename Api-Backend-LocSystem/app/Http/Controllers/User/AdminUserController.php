<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminUserManagementRequests\AdminUserChangePasswordRequest;
use App\Http\Requests\AdminUserManagementRequests\AdminUserStoreRequest;
use App\Http\Requests\AdminUserManagementRequests\AdminUserToggleStatusRequest;
use App\Http\Requests\AdminUserManagementRequests\AdminUserUpdateRequest;
use App\Http\Services\AdminUserService\AdminUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminUserController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(AdminUserService $service) {
        $this->service = $service;
    }


    /**
     * @OA\Get(
     *     path="/api/admin-users",
     *     summary="Lista os administradores cadastrados com filtros por busca e periodo.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=200,
     *         description="Administradores retornados com sucesso no campo adminUsers."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas administradores podem consultar administradores."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao listar os administradores."
     *     ),
     * )
     */
    public function list(Request $request): JsonResponse {
        try {

            $this->ensureAdmin();
            $users = $this->service->list($request);

            return response()->json([
                'success' => 'Administradores retornados com sucesso!',
                'adminUsers' => $users,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Get(
     *     path="/api/admin-users/{id}",
     *     summary="Retorna os detalhes de um administrador especifico.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=200,
     *         description="Administrador retornado com sucesso no campo adminUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou administrador nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao consultar o administrador."
     *     ),
     * )
     */
    public function findOne($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->findOne((int) $id);

            return response()->json([
                'success' => 'Administrador retornado com sucesso!',
                'adminUser' => $user,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/admin-users",
     *     summary="Cadastra um novo administrador com acesso inicial ao sistema.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=201,
     *         description="Administrador cadastrado com sucesso e retornado no campo adminUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas administradores podem cadastrar novos administradores."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="O e-mail informado ja esta em uso por outro usuario."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validacao nos dados enviados para cadastro do administrador."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao cadastrar o administrador."
     *     ),
     * )
     */
    public function create(AdminUserStoreRequest $request): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->create($request, (int) auth()->id());

            return response()->json([
                'success' => 'Administrador cadastrado com sucesso!',
                'adminUser' => $user,
            ], 201);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Put(
     *     path="/api/admin-users/{id}",
     *     summary="Atualiza os dados cadastrais de um administrador.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=200,
     *         description="Administrador atualizado com sucesso e retornado no campo adminUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou administrador nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Conflito de e-mail ou tentativa de gerenciar o administrador principal."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validacao nos dados enviados para atualizacao do administrador."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao atualizar o administrador."
     *     ),
     * )
     */
    public function update(AdminUserUpdateRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->update($request, (int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Administrador atualizado com sucesso!',
                'adminUser' => $user,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Patch(
     *     path="/api/admin-users/{id}/approval",
     *     summary="Aprova um administrador pendente para acesso ao sistema.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=200,
     *         description="Administrador aprovado com sucesso e retornado no campo adminUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou administrador nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Nao e permitido aprovar o administrador principal nesta acao."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao aprovar o administrador."
     *     ),
     * )
     */
    public function approve($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->approve((int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Administrador aprovado com sucesso!',
                'adminUser' => $user,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Patch(
     *     path="/api/admin-users/{id}/status",
     *     summary="Bloqueia ou desbloqueia um administrador conforme o status informado.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=200,
     *         description="Status do administrador atualizado com sucesso e dados retornados no campo adminUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou administrador nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Nao e permitido bloquear o proprio administrador autenticado nem gerenciar o administrador principal nesta acao."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validacao no payload de alteracao de status do administrador."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao atualizar o status do administrador."
     *     ),
     * )
     */
    public function toggleStatus(AdminUserToggleStatusRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->toggleStatus(
                (int) $id,
                (bool) $request->boolean('isActive'),
                $request->input('reason'),
                (int) auth()->id()
            );

            return response()->json([
                'success' => 'Status do administrador atualizado com sucesso!',
                'adminUser' => $user,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Patch(
     *     path="/api/admin-users/{id}/password",
     *     summary="Define uma nova senha para o administrador informado.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=200,
     *         description="Senha alterada com sucesso e confirmacao retornada no campo adminUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado, administrador nao encontrado ou conta de autenticacao inexistente."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validacao da nova senha informada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao alterar a senha do administrador."
     *     ),
     * )
     */
    public function changePassword(AdminUserChangePasswordRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $result = $this->service->changePassword((int) $id, (string) $request->input('v_password'), (int) auth()->id());

            return response()->json([
                'success' => 'Senha alterada com sucesso!',
                'adminUser' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/admin-users/{id}/reset-2fa",
     *     summary="Reseta a configuracao de autenticacao em dois fatores de um administrador.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=200,
     *         description="2FA resetado com sucesso e confirmacao retornada no campo adminUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou administrador nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao resetar o 2FA do administrador."
     *     ),
     * )
     */
    public function resetTwoFactor($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $result = $this->service->resetTwoFactor((int) $id, (int) auth()->id());

            return response()->json([
                'success' => '2FA resetado com sucesso!',
                'adminUser' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Delete(
     *     path="/api/admin-users/{id}",
     *     summary="Remove um administrador e seus vinculos de autenticacao relacionados.",
     *     tags={"Administradores"},
     *     @OA\Response(
     *         response=200,
     *         description="Administrador removido com sucesso e confirmacao retornada no campo adminUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou administrador nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Nao e permitido excluir o proprio administrador autenticado nem gerenciar o administrador principal nesta acao."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao remover o administrador."
     *     ),
     * )
     */
    public function delete($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $result = $this->service->delete((int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Administrador removido com sucesso!',
                'adminUser' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    protected function ensureAdmin(): void {
        $user = auth()->user();

        if (!$user || $user->e_role !== 'ADMIN') {
            throw new HttpException(401, 'Apenas administradores podem gerenciar administradores.');
        }
    }
}