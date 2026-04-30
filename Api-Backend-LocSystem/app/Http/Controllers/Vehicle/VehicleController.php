<?php

namespace App\Http\Controllers\Vehicle;

use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\vehicleManagementRequests\VehicleRegistrationRequest;
use App\Http\Services\VehicleService\VehicleRegistrationService;
use App\Http\Services\VehicleService\VehicleValidationService;
use Illuminate\Http\Request; 


class VehicleController extends Controller {

    protected $serviceRegistration;
    protected $serviceValidation;

    // Método Construtor
    public function __construct(VehicleRegistrationService $vehicleRegistrationService, VehicleValidationService $vehicleValidationService) {
        $this->serviceRegistration = $vehicleRegistrationService;
        $this->serviceValidation = $vehicleValidationService;
    }
  

/**
 * @OA\Post(
 *     path="/api/vehicles",
 *     summary="Realiza o retorno de veículos cadastrados.",
 *     tags={"Gerenciamento de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Veículos retornados com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function vehicles ($request): JsonResponse {
        try {

            $vehicle = $this->serviceRegistration->viewVehicles($request);

            return response()->json([
                'success' => 'Veículos retornados com sucesso!',
                'vehicle' => $vehicle,  
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
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }
    }


/**
 * @OA\Put(
 *     path="/api/updateRecord/",
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
    public function updateRecord(VehicleRegistrationRequest $request, $id): JsonResponse  {
        try {
            
            $this->serviceValidation->searchVehicle($id);

            $this->serviceValidation->verificationRegisterVehicles($request, $id);

            $updatedVehicle = $this->serviceRegistration->updateVehicles($request, $id, auth()->id());

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
    public function deleteRecord(Request $request): JsonResponse {
        try{

            $this->serviceValidation->searchVehicle($request->id);

            $deletedVehicle = $this->serviceRegistration->deleteVehicles($request->id);

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