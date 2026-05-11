<?php

namespace App\Http\Controllers\Logs;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use App\Http\Services\LogsService\LogsService;


class LogsController extends Controller {

    protected $logsService;

    // Método Construtor
    public function __construct(LogsService $logsService) {
        $this->logsService = $logsService;
    }
  

/**
 * @OA\Get(
 *     path="/api/logs",
 *     summary="Realiza o retorno dos logs cadastrados.",
 *     tags={"Gerenciamento de Logs"},
 *     @OA\Response(
 *         response=200,
 *         description="Logs retornados com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function logs(): JsonResponse {
        try {

            $logs = $this->logsService->viewLogs();

            return response()->json([
                'success' => 'Logs retornados com sucesso!',
                'logs' => $logs,  
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }

}