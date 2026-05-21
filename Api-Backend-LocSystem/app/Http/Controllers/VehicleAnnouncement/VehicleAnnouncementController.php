<?php

namespace App\Http\Controllers\VehicleAnnouncement;

use App\Http\Controllers\Controller;
use App\Http\Requests\VehicleAnnouncementManagementRequests\VehicleAnnouncementUpdateTypeRequest;
use App\Http\Services\VehicleAnnouncementService\VehicleAnnouncementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VehicleAnnouncementController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(VehicleAnnouncementService $service)
    {
        $this->service = $service;
    }


/**
 * @OA\Post(
 *     path="/api/vehicle-announcements",
 *     summary="Retorna a listagem de comunicados de veículos cadastrados.",
 *     tags={"Gerenciamento de Comunicados de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Comunicados retornados com sucesso, permitindo consulta com filtros de busca, tipo e período."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Usuário não autenticado ou sem permissão para acessar o gerenciamento de comunicados de veículos."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao consultar os comunicados de veículos."
 *     )
 * )
 */
    public function list(Request $request): JsonResponse {
        try {

            $this->ensureAdmin();
            
            $announcements = $this->service->list($request);

            return response()->json([
                'success' => 'Comunicados retornados com sucesso!',
                'vehicleAnnouncements' => $announcements,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!'
                ], 500);

        }
    }
    

/**
 * @OA\Put(
 *     path="/api/vehicle-announcements/{id}/type",
 *     summary="Atualiza o tipo de um comunicado de veículo específico.",
 *     tags={"Gerenciamento de Comunicados de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Tipo do comunicado atualizado com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Usuário não autenticado, sem permissão administrativa ou comunicado não encontrado."
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação nos dados enviados para atualização do tipo do comunicado."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao atualizar o tipo do comunicado."
 *     )
 * )
 */
    public function updateType(VehicleAnnouncementUpdateTypeRequest $request, $id): JsonResponse {
        try {

            $this->ensureAdmin();

            $announcement = $this->service->updateType((int) $id, (string) $request->input('type'), (int) auth()->id());

            return response()->json([
                'success' => 'Tipo de comunicado atualizado com sucesso!',
                'vehicleAnnouncement' => $announcement,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


/**
 * @OA\Delete(
 *     path="/api/vehicle-announcements/{id}",
 *     summary="Remove um comunicado de veículo do sistema.",
 *     tags={"Gerenciamento de Comunicados de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Comunicado removido com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Usuário não autenticado, sem permissão administrativa ou comunicado não encontrado."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao remover o comunicado."
 *     )
 * )
 */
    public function delete($id): JsonResponse {    
        try {

            $this->ensureAdmin();

            $announcement = $this->service->delete((int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Comunicado removido com sucesso!',
                'vehicleAnnouncement' => $announcement,
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
            throw new HttpException(401, 'Apenas administradores podem gerenciar comunicados de veículos.');
        }
        
    }
}