<?php

namespace App\Http\Controllers\CameraMonitoring;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Http\Services\CameraMonitoringService\CameraMonitoringService;
use App\Http\Requests\CameraMonitoring\SaveIncidenceRequest;
use App\Http\Requests\CameraMonitoring\SaveConfigRequest;


class CameraMonitoringController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(CameraMonitoringService $service)
    {
        $this->service = $service;
    }


    /**
     * @OA\Get(
     *     path="/api/camera-monitoring/config",
     *     summary="Retorna a configuração de câmera do usuário autenticado.",
     *     tags={"Camera de Monitoramento"},
     *     @OA\Response(
     *         response=200,
     *         description="Configuração retornada com sucesso!"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado, tente novamente!"
     *     ),
     * )
     */
    public function getConfig(Request $request): JsonResponse
    {
        try {

            $user   = $request->user();
            $config = $this->service->getConfig($user->i_id);

            return response()->json([
                'success' => 'Configuração retornada com sucesso!',
                'config'  => $config,
            ], 200);

        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }


    /**
     * @OA\Post(
     *     path="/api/camera-monitoring/config",
     *     summary="Salva a configuração de câmera do usuário autenticado.",
     *     tags={"Camera de Monitoramento"},
     *     @OA\Response(
     *         response=200,
     *         description="Configuração salva com sucesso!"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação!"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado, tente novamente!"
     *     ),
     * )
     */
    public function saveConfig(SaveConfigRequest $request): JsonResponse
    {
        try {

            $config = $this->service->saveConfig($request->only([
                'v_host', 'v_username', 'v_password', 'i_channel', 'b_enabled',
            ]), $request->user()->i_id);

            return response()->json([
                'success' => 'Configuração salva com sucesso!',
                'config'  => $config,
            ], 200);

        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }


    /**
     * @OA\Get(
     *     path="/api/camera-monitoring/search/{plate}",
     *     summary="Busca um veículo cadastrado pela placa (para o monitoramento ao vivo).",
     *     tags={"Camera de Monitoramento"},
     *     @OA\Response(
     *         response=200,
    *         description="Veiculo encontrado com sucesso!"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado, tente novamente!"
     *     ),
     * )
     */
    public function searchByPlate(Request $request, string $plate): JsonResponse
    {
        try {
            
            $result = $this->service->searchVehicleByPlate($plate, $request->user()->i_id);

            return response()->json($result, 200);

        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }


    /**
     * @OA\Post(
     *     path="/api/camera-monitoring/incidence",
     *     summary="Salva uma incidência capturada pela câmera externa.",
     *     tags={"Camera de Monitoramento"},
     *     @OA\Response(
     *         response=201,
     *         description="Incidência registrada com sucesso!"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Placa inválida!"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação!"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado, tente novamente!"
     *     ),
     * )
     */
    public function saveIncidence(SaveIncidenceRequest $request): JsonResponse
    {
        try {
            
            $data = $request->only(['plate', 'latitude', 'longitude', 'confidence']);
            if ($request->hasFile('image')) {
                $data['image'] = $request->file('image');
            }

            $incidence = $this->service->saveIncidence($data, $request->user()->i_id);

            return response()->json([
                'success'   => 'Incidência registrada com sucesso!',
                'incidence' => $incidence,
            ], 201);

        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }


    /**
     * @OA\Get(
     *     path="/api/camera-monitoring/history",
     *     summary="Retorna o histórico de detecções do usuário autenticado.",
     *     tags={"Camera de Monitoramento"},
     *     @OA\Response(
     *         response=200,
     *         description="Histórico retornado com sucesso!"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado, tente novamente!"
     *     ),
     * )
     */
    public function getHistory(Request $request): JsonResponse
    {
        try {

            $limit  = (int) $request->query('limit', 50);
            $offset = (int) $request->query('offset', 0);

            $history = $this->service->getDetectionHistory(
                $request->user()->i_id,
                min($limit, 100),
                max($offset, 0)
            );

            return response()->json([
                'success' => 'Histórico retornado com sucesso!',
                ...$history,
            ], 200);

        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }
}
