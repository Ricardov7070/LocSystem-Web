<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdvisoryUserManagementRequests\AdvisoryUserChangePasswordRequest;
use App\Http\Requests\AdvisoryUserManagementRequests\AdvisoryUserStoreRequest;
use App\Http\Requests\AdvisoryUserManagementRequests\AdvisoryUserToggleStatusRequest;
use App\Http\Requests\AdvisoryUserManagementRequests\AdvisoryUserUpdateRequest;
use App\Http\Services\AdvisoryUserService\AdvisoryUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdvisoryUserController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(AdvisoryUserService $service){
        $this->service = $service;
    }


    /**
     * @OA\Get(
     *     path="/api/advisory-users",
     *     summary="Lista os usuários de assessoria com suporte a filtros administrativos.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         required=false,
     *         description="Texto para busca por nome ou e-mail do usuário de assessoria.",
     *         @OA\Schema(type="string", example="maria")
     *     ),
     *     @OA\Parameter(
     *         name="data_inicial",
     *         in="query",
     *         required=false,
     *         description="Data inicial de cadastro para filtrar os usuários.",
     *         @OA\Schema(type="string", format="date", example="2026-01-01")
     *     ),
     *     @OA\Parameter(
     *         name="data_final",
     *         in="query",
     *         required=false,
     *         description="Data final de cadastro para filtrar os usuários.",
     *         @OA\Schema(type="string", format="date", example="2026-12-31")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Usuários de assessoria retornados com sucesso no campo advisoryUsers."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas administradores podem consultar usuários de assessoria."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao listar os usuários de assessoria."
     *     ),
     * )
     */
    public function list(Request $request): JsonResponse {
        try {

            $this->ensureAdmin();
            $users = $this->service->list($request);

            return response()->json([
                'success' => 'Usuários de assessoria retornados com sucesso!',
                'advisoryUsers' => $users,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        
        }
    }


    /**
     * @OA\Get(
     *     path="/api/advisory-users/{id}",
     *     summary="Retorna os detalhes de um usuário de assessoria específico.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do usuário de assessoria.",
     *         @OA\Schema(type="integer", example=8)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Usuário de assessoria retornado com sucesso no campo advisoryUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou usuário de assessoria não encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao consultar o usuário de assessoria."
     *     ),
     * )
     */
    public function findOne($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->findOne((int) $id);

            return response()->json([
                'success' => 'Usuário de assessoria retornado com sucesso!',
                'advisoryUser' => $user,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
       
        }
    }


    /**
     * @OA\Post(
     *     path="/api/advisory-users",
     *     summary="Cadastra um novo usuário de assessoria e vincula as assessorias informadas.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\RequestBody(
     *         required=true,
     *         description="Dados necessários para cadastro do usuário de assessoria.",
     *         @OA\JsonContent(
     *             required={"v_name","v_email","v_phone","v_password","legalAdvisoryIds"},
     *             @OA\Property(property="v_name", type="string", maxLength=255, example="Maria Souza", description="Nome completo do usuário de assessoria."),
     *             @OA\Property(property="v_email", type="string", format="email", example="maria@assessoria.com", description="E-mail de acesso do usuário."),
     *             @OA\Property(property="v_phone", type="string", maxLength=20, example="11999999999", description="Telefone de contato do usuário."),
     *             @OA\Property(property="v_password", type="string", minLength=8, maxLength=32, example="Senha123!", description="Senha inicial da conta."),
     *             @OA\Property(
     *                 property="legalAdvisoryIds",
     *                 type="array",
     *                 description="Lista de assessorias jurídicas às quais o usuário terá acesso.",
     *                 @OA\Items(type="integer", example=3)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Usuário de assessoria cadastrado com sucesso e retornado no campo advisoryUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas administradores podem cadastrar usuários de assessoria."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="O e-mail informado já está em uso por outro usuário."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação nos dados enviados ou assessoria informada inválida."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao cadastrar o usuário de assessoria."
     *     ),
     * )
     */
    public function create(AdvisoryUserStoreRequest $request): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->create($request, (int) auth()->id());

            return response()->json([
                'success' => 'Usuário de assessoria cadastrado com sucesso!',
                'advisoryUser' => $user,
            ], 201);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Put(
     *     path="/api/advisory-users/{id}",
     *     summary="Atualiza os dados e os vínculos de assessorias de um usuário de assessoria.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do usuário de assessoria que será atualizado.",
     *         @OA\Schema(type="integer", example=8)
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         description="Dados atualizados do usuário de assessoria.",
     *         @OA\JsonContent(
     *             required={"v_name","v_email","v_phone","legalAdvisoryIds"},
     *             @OA\Property(property="v_name", type="string", maxLength=255, example="Maria Souza", description="Nome completo do usuário de assessoria."),
     *             @OA\Property(property="v_email", type="string", format="email", example="maria@assessoria.com", description="E-mail de acesso do usuário."),
     *             @OA\Property(property="v_phone", type="string", maxLength=20, example="11999999999", description="Telefone de contato do usuário."),
     *             @OA\Property(
     *                 property="legalAdvisoryIds",
     *                 type="array",
     *                 description="Lista atualizada de assessorias jurídicas às quais o usuário terá acesso.",
     *                 @OA\Items(type="integer", example=3)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Usuário de assessoria atualizado com sucesso e retornado no campo advisoryUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou usuário de assessoria não encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="O e-mail informado já está em uso por outro usuário."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação nos dados enviados ou assessoria informada inválida."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao atualizar o usuário de assessoria."
     *     ),
     * )
     */
    public function update(AdvisoryUserUpdateRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->update($request, (int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Usuário de assessoria atualizado com sucesso!',
                'advisoryUser' => $user,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        
        }
    }


    /**
     * @OA\Delete(
     *     path="/api/advisory-users/{id}",
     *     summary="Remove um usuário de assessoria quando não houver veículos vinculados aos seus acessos.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do usuário de assessoria que será removido.",
     *         @OA\Schema(type="integer", example=8)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Usuário de assessoria removido com sucesso e confirmação retornada no campo advisoryUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou usuário de assessoria não encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="O usuário não pode ser removido porque possui veículos vinculados às assessorias acessíveis."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao remover o usuário de assessoria."
     *     ),
     * )
     */
    public function delete($id): JsonResponse{
        try {

            $this->ensureAdmin();
            $result = $this->service->delete((int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Usuário de assessoria removido com sucesso!',
                'advisoryUser' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        
        }
    }


    /**
     * @OA\Patch(
     *     path="/api/advisory-users/{id}/status",
     *     summary="Ativa ou bloqueia um usuário de assessoria.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do usuário de assessoria cujo status será alterado.",
     *         @OA\Schema(type="integer", example=8)
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         description="Dados para ativar ou bloquear o usuário de assessoria.",
     *         @OA\JsonContent(
     *             required={"isActive"},
     *             @OA\Property(property="isActive", type="boolean", example=false, description="Indica se o usuário deve ficar ativo ou bloqueado.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Status do usuário atualizado com sucesso e dados retornados no campo advisoryUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou usuário de assessoria não encontrado."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação no payload de alteração de status."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao atualizar o status do usuário de assessoria."
     *     ),
     * )
     */
    public function toggleStatus(AdvisoryUserToggleStatusRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $user = $this->service->toggleStatus((int) $id, (bool) $request->input('isActive'), (int) auth()->id());

            return response()->json([
                'success' => 'Status do usuário atualizado com sucesso!',
                'advisoryUser' => $user,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Patch(
     *     path="/api/advisory-users/{id}/password",
     *     summary="Define uma nova senha para o usuário de assessoria informado.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do usuário de assessoria que terá a senha alterada.",
     *         @OA\Schema(type="integer", example=8)
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         description="Nova senha do usuário de assessoria.",
     *         @OA\JsonContent(
     *             required={"v_password"},
     *             @OA\Property(property="v_password", type="string", minLength=8, maxLength=32, example="NovaSenha123!", description="Nova senha da conta do usuário.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Senha alterada com sucesso e confirmação retornada no campo advisoryUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado, usuário de assessoria não encontrado ou conta de autenticação inexistente."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação da nova senha informada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao alterar a senha do usuário de assessoria."
     *     ),
     * )
     */
    public function changePassword(AdvisoryUserChangePasswordRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $result = $this->service->changePassword((int) $id, (string) $request->input('v_password'), (int) auth()->id());

            return response()->json([
                'success' => 'Senha alterada com sucesso!',
                'advisoryUser' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/advisory-users/{id}/reset-2fa",
     *     summary="Reseta a configuração de autenticação em dois fatores de um usuário de assessoria.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do usuário de assessoria que terá o 2FA resetado.",
     *         @OA\Schema(type="integer", example=8)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="2FA resetado com sucesso e confirmação retornada no campo advisoryUser."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou usuário de assessoria não encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao resetar o 2FA do usuário de assessoria."
     *     ),
     * )
     */
    public function resetTwoFactor($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $result = $this->service->resetTwoFactor((int) $id, (int) auth()->id());

            return response()->json([
                'success' => '2FA resetado com sucesso!',
                'advisoryUser' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
       
        }
    }


    /**
     * @OA\Get(
     *     path="/api/advisory-users/my-tenants",
     *     summary="Retorna as assessorias jurídicas às quais o usuário de assessoria autenticado possui acesso.",
     *     tags={"Usuários de Assessoria"},
     *     @OA\Response(
     *         response=200,
     *         description="Tenants retornados com sucesso no campo tenants, incluindo dados básicos da assessoria e da carteira associada quando existir."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas usuários de assessoria autenticados podem consultar seus tenants."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao consultar os tenants do usuário autenticado."
     *     ),
     * )
     */
    public function myTenants(): JsonResponse {
        try {

            $user = auth()->user();
            if ($user->e_role !== 'AUDITOR') {
                throw new HttpException(401, 'Apenas usuários de assessoria podem acessar seus tenants.');
            }

            $tenants = $this->service->myTenants((int) $user->i_id);

            return response()->json([
                'success' => 'Tenants retornados com sucesso!',
                'tenants' => $tenants,
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
            throw new HttpException(401, 'Apenas administradores podem gerenciar usuários de assessoria.');
        }
    }
}
