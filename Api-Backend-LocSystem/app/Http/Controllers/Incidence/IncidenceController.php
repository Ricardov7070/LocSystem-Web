<?php

namespace App\Http\Controllers\Incidence;

use App\Http\Controllers\Controller;
use App\Http\Services\IncidenceService\IncidenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class IncidenceController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(IncidenceService $service)
    {
        $this->service = $service;
    }


    /**
     * @OA\Get(
     *     path="/api/incidences-history",
     *     summary="Retorna o histórico de incidências acessíveis ao usuário autenticado.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Incidências retornadas com sucesso, incluindo a lista no campo incidences."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para consultar o histórico solicitado."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao listar o histórico de incidências."
     *     ),
     * )
     */
    public function history(Request $request): JsonResponse {
        try {

            $incidences = $this->service->listHistory($request, $request->user());

            return response()->json([
                'success' => 'Incidências retornadas com sucesso!',
                'incidences' => $incidences,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);
            
        }
    }

    
    /**
     * @OA\Get(
     *     path="/api/incidences-history/count",
     *     summary="Retorna a quantidade total de incidências do histórico conforme os filtros informados.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Contagem retornada com sucesso no campo count."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para consultar a contagem solicitada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao contar as incidências do histórico."
     *     ),
     * )
     */
    public function historyCount(Request $request): JsonResponse {
        try {

            $count = $this->service->countHistory($request, $request->user());

            return response()->json([
                'success' => 'Contagem retornada com sucesso!',
                'count' => $count,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


    /**
     * @OA\Get(
     *     path="/api/incidences-history/{id}",
     *     summary="Retorna os detalhes de uma incidência específica do histórico.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Incidência retornada com sucesso no campo incidence."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para acessar a incidência informada."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Incidência não encontrada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao consultar a incidência."
     *     ),
     * )
     */
    public function historyShow(Request $request, $id): JsonResponse {
        try {

            $incidence = $this->service->showHistory((int) $id, $request->user());

            return response()->json([
                'success' => 'Incidência retornada com sucesso!',
                'incidence' => $incidence,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


    /**
     * @OA\Delete(
     *     path="/api/incidences-history/{id}",
     *     summary="Remove uma incidência do histórico quando o usuário possui permissão sobre o registro.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Incidência removida com sucesso e dados do registro removido retornados no campo incidence."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para remover a incidência informada."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Incidência não encontrada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao remover a incidência."
     *     ),
     * )
     */
    public function historyDelete(Request $request, $id): JsonResponse {
        try {

            $deleted = $this->service->deleteHistory((int) $id, $request->user());

            return response()->json([
                'success' => 'Incidência removida com sucesso!',
                'incidence' => $deleted,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


    /**
     * @OA\Get(
     *     path="/api/retroactive-incidences",
     *     summary="Retorna a lista de incidências retroativas acessíveis ao usuário autenticado.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Incidências retroativas retornadas com sucesso no campo incidences."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para consultar as incidências retroativas."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao listar as incidências retroativas."
     *     ),
     * )
     */
    public function retroactive(Request $request): JsonResponse {
        try {

            $incidences = $this->service->listRetroactive($request, $request->user());

            return response()->json([
                'success' => 'Incidências retroativas retornadas com sucesso!',
                'incidences' => $incidences,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


    /**
     * @OA\Get(
     *     path="/api/retroactive-incidences/count",
     *     summary="Retorna a quantidade total de incidências retroativas conforme os filtros aplicados.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Contagem de incidências retroativas retornada com sucesso no campo count."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para consultar a contagem de incidências retroativas."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao contar as incidências retroativas."
     *     ),
     * )
     */
    public function retroactiveCount(Request $request): JsonResponse {
        try {

            $count = $this->service->countRetroactive($request, $request->user());

            return response()->json([
                'success' => 'Contagem retornada com sucesso!',
                'count' => $count,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {
            
            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


    /**
     * @OA\Get(
     *     path="/api/retroactive-incidences/{id}",
     *     summary="Retorna os detalhes de uma incidência retroativa específica.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Incidência retroativa retornada com sucesso no campo incidence."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para acessar a incidência retroativa informada."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Incidência retroativa não encontrada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao consultar a incidência retroativa."
     *     ),
     * )
     */
    public function retroactiveShow(Request $request, $id): JsonResponse {
        try {

            $incidence = $this->service->showRetroactive((int) $id, $request->user());

            return response()->json([
                'success' => 'Incidência retroativa retornada com sucesso!',
                'incidence' => $incidence,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/retroactive-incidences/{id}/read",
     *     summary="Marca uma incidência retroativa como lida e retorna os metadados atualizados.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Incidência retroativa marcada como lida com sucesso e retorno no campo retroactive."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para alterar a incidência retroativa informada."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Incidência retroativa não encontrada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao marcar a incidência retroativa como lida."
     *     ),
     * )
     */
    public function retroactiveMarkAsRead(Request $request, $id): JsonResponse {
        try {

            $retroactive = $this->service->markRetroactiveAsRead((int) $id, $request->user());

            return response()->json([
                'success' => 'Incidência retroativa marcada como lida!',
                'retroactive' => $retroactive,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


    /**
     * @OA\Delete(
     *     path="/api/retroactive-incidences/{id}",
     *     summary="Remove uma incidência retroativa e retorna os metadados do registro excluído.",
     *     tags={"Incidências"},
     *     @OA\Response(
     *         response=200,
     *         description="Incidência retroativa removida com sucesso e dados retornados no campo retroactive."
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="O usuário não possui permissão para remover a incidência retroativa informada."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Incidência retroativa não encontrada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao remover a incidência retroativa."
     *     ),
     * )
     */
    public function retroactiveDelete(Request $request, $id): JsonResponse {
        try {

            $deleted = $this->service->deleteRetroactive((int) $id, $request->user());

            return response()->json([
                'success' => 'Incidência retroativa removida com sucesso!',
                'retroactive' => $deleted,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);
            
        }
    }
}