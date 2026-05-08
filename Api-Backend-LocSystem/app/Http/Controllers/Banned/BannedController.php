<?php

namespace App\Http\Controllers\Banned;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use App\Http\Services\BannedService\BannedService;
use App\Http\Services\BannedService\BannedServiceValidation;


class BannedController extends Controller {

    protected $serviceBanned;
    protected $serviceValidation;

    // Método Construtor
    public function __construct(BannedService $serviceBanned, BannedServiceValidation $serviceValidation) {
        $this->serviceBanned = $serviceBanned;
        $this->serviceValidation = $serviceValidation;
    }
  

/**
 * @OA\Get(
 *     path="/api/banneds",
 *     summary="Realiza o retorno dos usuários banidos.",
 *     tags={"Gerenciamento de Usuários Banidos"},
 *     @OA\Response(
 *         response=200,
 *         description="Usuários banidos retornados com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function banneds(): JsonResponse {
        try {

            $banneds = $this->serviceBanned->viewBanneds();

            return response()->json([
                'success' => 'Usuários banidos retornados com sucesso!',
                'banneds' => $banneds,  
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }


/**
 * @OA\Post(
 *     path="/api/singleBanned/{id}",
 *     summary="Realiza o desbanimento de um usuário específico.",
 *     tags={"Gerenciamento de Usuários Banidos"},
 *     @OA\Response(
 *         response=200,
 *         description="Usuário desbanido com sucesso!"
 *     ),
 *      @OA\Response(
 *         response=401,
 *         description="Usuário banido não encontrado!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function singleBanned($idUser): JsonResponse {
        try {

            $this->serviceValidation->searchBanned($idUser);

            $this->serviceBanned->updateUserBanned($idUser);

            return response()->json([
                'success' => 'Usuário desbanido com sucesso!',  
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }

}