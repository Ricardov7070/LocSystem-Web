<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\OperatorManagementRequests\MyDeputyStoreRequest;
use App\Http\Requests\OperatorManagementRequests\OperatorToggleStatusRequest;
use App\Http\Services\OperatorService\MyDeputyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MyDeputyController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(MyDeputyService $service) {
        $this->service = $service;
    }


    /**
     * @OA\Get(
     *     path="/api/my-deputies",
     *     summary="Lista os prepostos acessiveis ao usuario autenticado com filtros por busca e periodo.",
     *     tags={"Prepostos"},
     *     @OA\Response(
     *         response=200,
     *         description="Prepostos retornados com sucesso no campo deputies."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas administradores e operadores podem consultar prepostos."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao listar os prepostos."
     *     ),
     * )
     */
    public function list(Request $request): JsonResponse {
        try {

            $user = $this->ensureAdminOrOperator();
            $deputies = $this->service->list($request, (int) $user->i_id, (string) $user->e_role);

            return response()->json([
                'success' => 'Prepostos retornados com sucesso!',
                'deputies' => $deputies,
            ], 200);
            
        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/my-deputies",
     *     summary="Cadastra um novo preposto vinculado ao operador autenticado.",
     *     tags={"Prepostos"},
     *     @OA\Response(
     *         response=201,
     *         description="Preposto cadastrado com sucesso e retornado no campo deputy."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas operadores podem cadastrar prepostos."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Operador sem permissao operacional, e-mail ja utilizado ou limite de prepostos atingido."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validacao nos dados enviados para cadastro do preposto."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao cadastrar o preposto."
     *     ),
     * )
     */
    public function create(MyDeputyStoreRequest $request): JsonResponse {
        try {

            $this->ensureOperator();
            $deputy = $this->service->create($request, (int) auth()->id());

            return response()->json([
                'success' => 'Preposto cadastrado com sucesso!',
                'deputy' => $deputy,
            ], 201);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Patch(
     *     path="/api/my-deputies/{id}/approval",
     *     summary="Aprova um preposto para acesso ao sistema.",
     *     tags={"Prepostos"},
     *     @OA\Response(
     *         response=200,
     *         description="Preposto aprovado com sucesso e retornado no campo deputy."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou preposto nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao aprovar o preposto."
     *     ),
     * )
     */
    public function approve($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $deputy = $this->service->approve((int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Olheiro aprovado com sucesso!',
                'deputy' => $deputy,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Patch(
     *     path="/api/my-deputies/{id}/status",
     *     summary="Bloqueia ou desbloqueia um preposto conforme o status informado.",
     *     tags={"Prepostos"},
     *     @OA\Response(
     *         response=200,
     *         description="Status do preposto atualizado com sucesso e dados retornados no campo deputy."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou preposto nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="O desbloqueio nao pode ser realizado antes da aprovacao, com operador bloqueado ou quando a assinatura nao estiver ativa."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validacao no payload de alteracao de status do preposto."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao atualizar o status do preposto."
     *     ),
     * )
     */
    public function toggleStatus(OperatorToggleStatusRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $deputy = $this->service->toggleStatus(
                (int) $id,
                (bool) $request->boolean('isActive'),
                $request->input('reason'),
                (int) auth()->id()
            );

            return response()->json([
                'success' => 'Status do olheiro atualizado com sucesso!',
                'deputy' => $deputy,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/my-deputies/{id}/reset-2fa",
     *     summary="Reseta a configuracao de autenticacao em dois fatores de um preposto.",
     *     tags={"Prepostos"},
     *     @OA\Response(
     *         response=200,
     *         description="2FA resetado com sucesso e confirmacao retornada no campo deputy."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou preposto nao encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao resetar o 2FA do preposto."
     *     ),
     * )
     */
    public function resetTwoFactor($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $result = $this->service->resetTwoFactor((int) $id, (int) auth()->id());

            return response()->json([
                'success' => '2FA do olheiro resetado com sucesso!',
                'deputy' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    protected function ensureOperator(): void {
        $user = auth()->user();

        if (!$user || $user->e_role !== 'OPERATOR') {
            throw new HttpException(401, 'Apenas operadores podem gerenciar prepostos.');
        }
    }


    protected function ensureAdmin(): void {
        $user = auth()->user();

        if (!$user || $user->e_role !== 'ADMIN') {
            throw new HttpException(401, 'Apenas administradores podem gerenciar olheiros.');
        }
    }


    protected function ensureAdminOrOperator() {
        $user = auth()->user();

        if (!$user || !in_array($user->e_role, ['ADMIN', 'OPERATOR'], true)) {
            throw new HttpException(401, 'Apenas administradores e operadores podem acessar prepostos.');
        }

        return $user;
    }
}