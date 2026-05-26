<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\OperatorManagementRequests\OperatorChangePasswordRequest;
use App\Http\Requests\OperatorManagementRequests\OperatorRenewSubscriptionRequest;
use App\Http\Requests\OperatorManagementRequests\OperatorStoreRequest;
use App\Http\Requests\OperatorManagementRequests\OperatorToggleStatusRequest;
use App\Http\Requests\OperatorManagementRequests\OperatorUpdateRequest;
use App\Http\Services\OperatorService\OperatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OperatorController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(OperatorService $service) {
        $this->service = $service;
    }


    /**
     * @OA\Get(
     *     path="/api/operators",
     *     summary="Lista os localizadores cadastrados com suporte a filtros administrativos.",
     *     tags={"Localizadores"},
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         required=false,
     *         description="Texto para busca por nome, e-mail, telefone ou documento do localizador.",
     *         @OA\Schema(type="string", example="joao")
     *     ),
     *     @OA\Parameter(
     *         name="data_inicial",
     *         in="query",
     *         required=false,
     *         description="Data inicial de cadastro para filtrar os localizadores.",
     *         @OA\Schema(type="string", format="date", example="2026-01-01")
     *     ),
     *     @OA\Parameter(
     *         name="data_final",
     *         in="query",
     *         required=false,
     *         description="Data final de cadastro para filtrar os localizadores.",
     *         @OA\Schema(type="string", format="date", example="2026-12-31")
     *     ),
     *     @OA\Parameter(
     *         name="access_type",
     *         in="query",
     *         required=false,
     *         description="Filtra localizadores por tipo de acesso contratado.",
     *         @OA\Schema(type="string", enum={"courtesy","monthly"}, example="monthly")
     *     ),
     *     @OA\Parameter(
     *         name="subscription_status",
     *         in="query",
     *         required=false,
     *         description="Filtra localizadores por situação da assinatura ou bloqueio.",
     *         @OA\Schema(type="string", enum={"active","past_due","inactive","blocked"}, example="active")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Localizadores retornados com sucesso no campo operators."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas administradores podem consultar localizadores."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao listar os localizadores."
     *     ),
     * )
     */
    public function list(Request $request): JsonResponse {
        try {

            $this->ensureAdmin();
            $operators = $this->service->list($request);

            return response()->json([
                'success' => 'Localizadores retornados com sucesso!',
                'operators' => $operators,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Get(
     *     path="/api/operators/{id}",
     *     summary="Retorna os detalhes de um localizador específico.",
     *     tags={"Localizadores"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do localizador.",
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Localizador retornado com sucesso no campo operator."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou localizador não encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao consultar o localizador."
     *     ),
     * )
     */
    public function findOne($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $operator = $this->service->findOne((int) $id);

            return response()->json([
                'success' => 'Localizador retornado com sucesso!',
                'operator' => $operator,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/operators",
     *     summary="Cadastra um novo localizador com dados de acesso e assinatura.",
     *     tags={"Localizadores"},
     *     @OA\RequestBody(
     *         required=true,
     *         description="Dados necessários para cadastro do localizador.",
     *         @OA\JsonContent(
     *             required={"v_name","v_email","v_password","v_document","v_phone"},
     *             @OA\Property(property="v_name", type="string", maxLength=255, example="João Silva", description="Nome completo do localizador."),
     *             @OA\Property(property="v_email", type="string", format="email", maxLength=255, example="joao@empresa.com", description="E-mail de acesso do localizador."),
     *             @OA\Property(property="v_password", type="string", minLength=8, maxLength=64, example="Senha123!", description="Senha inicial da conta."),
     *             @OA\Property(property="v_document", type="string", minLength=14, maxLength=14, example="12345678901234", description="Documento numérico do localizador."),
     *             @OA\Property(property="v_phone", type="string", minLength=10, maxLength=11, example="11999999999", description="Telefone do localizador sem máscara."),
     *             @OA\Property(property="i_user_limit", type="integer", nullable=true, example=10, description="Limite de prepostos vinculados ao localizador."),
     *             @OA\Property(property="b_is_courtesy", type="boolean", example=false, description="Define se o localizador é do tipo cortesia."),
     *             @OA\Property(property="i_pricing_plan_id", type="integer", nullable=true, example=2, description="Plano de precificação obrigatório quando o localizador não é cortesia.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Localizador cadastrado com sucesso e retornado no campo operator."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas administradores podem cadastrar localizadores."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="E-mail já utilizado ou plano obrigatório não informado para localizador mensalista."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação nos dados enviados para cadastro do localizador."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao cadastrar o localizador."
     *     ),
     * )
     */
    public function create(OperatorStoreRequest $request): JsonResponse {
        try {

            $this->ensureAdmin();
            $operator = $this->service->create($request, (int) auth()->id());

            return response()->json([
                'success' => 'Localizador cadastrado com sucesso!',
                'operator' => $operator,
            ], 201);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Put(
     *     path="/api/operators/{id}",
     *     summary="Atualiza os dados cadastrais e comerciais de um localizador.",
     *     tags={"Localizadores"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do localizador que será atualizado.",
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         description="Dados atualizados do localizador.",
     *         @OA\JsonContent(
     *             required={"v_name","v_email","v_document","v_phone"},
     *             @OA\Property(property="v_name", type="string", maxLength=255, example="João Silva", description="Nome completo do localizador."),
     *             @OA\Property(property="v_email", type="string", format="email", maxLength=255, example="joao@empresa.com", description="E-mail de acesso do localizador."),
     *             @OA\Property(property="v_document", type="string", minLength=14, maxLength=14, example="12345678901234", description="Documento numérico do localizador."),
     *             @OA\Property(property="v_phone", type="string", minLength=10, maxLength=11, example="11999999999", description="Telefone do localizador sem máscara."),
     *             @OA\Property(property="i_user_limit", type="integer", nullable=true, example=10, description="Limite máximo de prepostos ativos vinculados."),
     *             @OA\Property(property="b_is_courtesy", type="boolean", example=false, description="Define se o localizador deve operar como cortesia."),
     *             @OA\Property(property="i_pricing_plan_id", type="integer", nullable=true, example=2, description="Plano de precificação obrigatório quando o localizador não é cortesia.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Localizador atualizado com sucesso e retornado no campo operator."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou localizador não encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Conflito de e-mail, limite de prepostos inválido ou plano obrigatório não informado."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação nos dados enviados para atualização do localizador."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao atualizar o localizador."
     *     ),
     * )
     */
    public function update(OperatorUpdateRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $operator = $this->service->update($request, (int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Localizador atualizado com sucesso!',
                'operator' => $operator,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Delete(
     *     path="/api/operators/{id}",
     *     summary="Remove um localizador e seus vínculos administrativos relacionados.",
     *     tags={"Localizadores"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do localizador que será removido.",
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Localizador removido com sucesso e confirmação retornada no campo operator."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou localizador não encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao remover o localizador."
     *     ),
     * )
     */
    public function delete($id): JsonResponse {
        try {
            
            $this->ensureAdmin();
            $result = $this->service->delete((int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Localizador removido com sucesso!',
                'operator' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Patch(
     *     path="/api/operators/{id}/status",
     *     summary="Bloqueia ou desbloqueia um localizador conforme o status informado.",
     *     tags={"Localizadores"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do localizador cujo status será alterado.",
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         description="Dados para ativar ou bloquear o localizador.",
     *         @OA\JsonContent(
     *             required={"isActive"},
     *             @OA\Property(property="isActive", type="boolean", example=false, description="Indica se o localizador deve ficar ativo ou bloqueado."),
     *             @OA\Property(property="reason", type="string", nullable=true, maxLength=1000, example="Bloqueio administrativo.", description="Motivo opcional do bloqueio quando isActive for false.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Status do localizador atualizado com sucesso e dados retornados no campo operator."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou localizador não encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="O desbloqueio não pode ser realizado porque a assinatura do localizador não está ativa."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação no payload de alteração de status."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao atualizar o status do localizador."
     *     ),
     * )
     */
    public function toggleStatus(OperatorToggleStatusRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $operator = $this->service->toggleStatus(
                (int) $id,
                (bool) $request->boolean('isActive'),
                $request->input('reason'),
                (int) auth()->id()
            );

            return response()->json([
                'success' => 'Status do localizador atualizado com sucesso!',
                'operator' => $operator,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        
        }
    }


    /**
     * @OA\Patch(
     *     path="/api/operators/{id}/subscription",
     *     summary="Renova a assinatura de um localizador mensalista.",
     *     tags={"Localizadores"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do localizador que terá a assinatura renovada.",
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         description="Dados de renovação da assinatura do localizador.",
     *         @OA\JsonContent(
     *             required={"d_subscription_expires_at"},
     *             @OA\Property(property="d_subscription_expires_at", type="string", format="date", example="2026-12-31", description="Nova data de vencimento da assinatura."),
     *             @OA\Property(property="i_pricing_plan_id", type="integer", nullable=true, example=2, description="Plano de precificação opcional para sobrescrever o plano atual.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Assinatura renovada com sucesso e dados atualizados retornados no campo operator."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou localizador não encontrado."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="A renovação não pode ser realizada para localizador cortesia ou sem plano válido."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação nos dados de renovação da assinatura."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao renovar a assinatura do localizador."
     *     ),
     * )
     */
    public function renewSubscription(OperatorRenewSubscriptionRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $operator = $this->service->renewSubscription(
                (int) $id,
                (string) $request->input('d_subscription_expires_at'),
                $request->input('i_pricing_plan_id') ? (int) $request->input('i_pricing_plan_id') : null,
                (int) auth()->id()
            );

            return response()->json([
                'success' => 'Assinatura renovada com sucesso!',
                'operator' => $operator,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        
        }
    }


    /**
     * @OA\Patch(
     *     path="/api/operators/{id}/password",
     *     summary="Define uma nova senha para o localizador informado.",
     *     tags={"Localizadores"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do localizador que terá a senha alterada.",
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         description="Nova senha do localizador.",
     *         @OA\JsonContent(
     *             required={"v_password"},
     *             @OA\Property(property="v_password", type="string", minLength=8, maxLength=64, example="NovaSenha123!", description="Nova senha da conta do localizador.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Senha alterada com sucesso e confirmação retornada no campo operator."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado, localizador não encontrado ou conta de autenticação inexistente."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação da nova senha informada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao alterar a senha do localizador."
     *     ),
     * )
     */
    public function changePassword(OperatorChangePasswordRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();
            $result = $this->service->changePassword((int) $id, (string) $request->input('v_password'), (int) auth()->id());

            return response()->json([
                'success' => 'Senha alterada com sucesso!',
                'operator' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/operators/{id}/reset-2fa",
     *     summary="Reseta a configuração de autenticação em dois fatores de um localizador.",
     *     tags={"Localizadores"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Identificador do localizador que terá o 2FA resetado.",
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="2FA resetado com sucesso e confirmação retornada no campo operator."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou localizador não encontrado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao resetar o 2FA do localizador."
     *     ),
     * )
     */
    public function resetTwoFactor($id): JsonResponse {
        try {

            $this->ensureAdmin();
            $result = $this->service->resetTwoFactor((int) $id, (int) auth()->id());

            return response()->json([
                'success' => '2FA resetado com sucesso!',
                'operator' => $result,
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
            throw new HttpException(401, 'Apenas administradores podem gerenciar localizadores.');
        }
    }
}