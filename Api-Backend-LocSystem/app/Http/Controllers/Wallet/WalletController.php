<?php

namespace App\Http\Controllers\Vehicle;

use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\WalletManagementRequests\WalletRegistrationRequest;
use App\Http\Services\WalletService\WalletRegistrationService;
use App\Http\Services\WalletService\WalletValidationService;
use Illuminate\Http\Request; 


class WalletController extends Controller {

    protected $serviceRegistration;
    protected $serviceValidation;

    // Método Construtor
    public function __construct(WalletRegistrationService $walletRegistrationService, WalletValidationService $walletValidationService) {
        $this->serviceRegistration = $walletRegistrationService;
        $this->serviceValidation = $walletValidationService;
    }
  

/**
 * @OA\Get(
 *     path="/api/wallets",
 *     summary="Realiza o retorno das carteiras cadastradas.",
 *     tags={"Gerenciamento de Carteiras"},
 *     @OA\Response(
 *         response=200,
 *         description="Carteiras retornadas com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function wallets (Request $request): JsonResponse {
        try {

            $wallet = $this->serviceRegistration->viewWallets();

            return response()->json([
                'success' => 'Carteiras retornadas com sucesso!',
                'wallet' => $wallet,  
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }


/**
 * @OA\Get(
 *     path="/api/wallet/{id}",
 *     summary="Realiza o retorno de uma carteira específica.",
 *     tags={"Gerenciamento de Carteiras"},
 *     @OA\Response(
 *         response=200,
 *         description="Carteira retornada com sucesso!"
 *     ),
 *      @OA\Response(
 *         response=401,
 *         description="Carteira não encontrada!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function singleWallet ($idWallet): JsonResponse {
        try {

            $this->serviceValidation->searchWallet($idWallet);

            $wallet = $this->serviceRegistration->viewSingleWallet($idWallet);

            return response()->json([
                'success' => 'Carteira retornada com sucesso!',
                'wallet' => $wallet,  
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }


/**
 * @OA\Post(
 *     path="/api/registerVehicle",
 *     summary="Realiza o registro do veículo.",
 *     tags={"Gerenciamento de Veículos"},
 *     @OA\Response(
 *         response=201,
 *         description="Registro realizado com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Veículo já cadastrado!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação!"
 *     ),
 * )
 */
    public function registerVehicle (VehicleRegistrationRequest $request): JsonResponse {
        try {

            $this->serviceValidation->verificationRegisterVehicles($request, null);

            $vehicle = $this->serviceRegistration->createVehicles($request, auth()->id());

            return response()->json([
                'success' => 'Registro realizado com sucesso!',
                'vehicle' => $vehicle,  
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
                //'error' => 'Ocorreu um erro, tente novamente!',
                'error' => $th->getMessage(),
            ], 500);

        }
    }


/**
 * @OA\Put(
 *     path="/api/updateVehicle/{id}",
 *     summary="Realiza a atualização de dados cadastrais do Veículo registrado.",
 *     tags={"Gerenciamento de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Atualização realizada com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Veículo não encontrado!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Placa já cadastrada para outro veículo!"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação!"
 *     ),
 * )
 */
    public function updateRecord(VehicleRegistrationRequest $request, $idVehicle): JsonResponse  {
        try {
            
            $this->serviceValidation->searchVehicle($idVehicle);

            $this->serviceValidation->verificationRegisterVehicles($request, $idVehicle);

            $updatedVehicle = $this->serviceRegistration->updateVehicles($request, $idVehicle, auth()->id());

            return response()->json([
                'success' => 'Atualização realizada com sucesso!',
                'vehicle' => $updatedVehicle
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
 *     path="/api/deleteRecord",
 *     summary="Realiza a exclusão do veículo selecionado do banco de dados",
 *     tags={"Gerenciamento de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Excluído com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Veículo não encontrado!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 * )
 */
    public function deleteRecord($idVehicle): JsonResponse {
        try{

            $this->serviceValidation->searchVehicle($idVehicle);

            $deletedVehicle = $this->serviceRegistration->deleteVehicles($idVehicle);

            return response()->json([
                'success' => 'Excluído com sucesso!',
                'vehicle' => $deletedVehicle,
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