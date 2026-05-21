<?php

namespace App\Http\Controllers\PricingPlan;

use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\PricingPlanManagementRequests\PricingPlanRegistrationRequest;
use App\Http\Services\PricingPlanService\PricingPlanRegistrationService;
use App\Http\Services\PricingPlanService\PricingPlanValidationService;


class PricingPlanController extends Controller {

    protected $serviceRegistration;
    protected $serviceValidation;

    // Método Construtor
    public function __construct(PricingPlanRegistrationService $pricingPlanRegistrationService, PricingPlanValidationService $pricingPlanValidationService) {
        $this->serviceRegistration = $pricingPlanRegistrationService;
        $this->serviceValidation = $pricingPlanValidationService;
    }
  

/**
 * @OA\Get(
 *     path="/api/pricingPlans",
 *     summary="Realiza o retorno dos planos de preços cadastrados.",
 *     tags={"Gerenciamento de Planos de Preços"},
 *     @OA\Response(
 *         response=200,
 *         description="Planos de preços retornados com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function pricingPlans(): JsonResponse {
        try {

            $pricingPlans = $this->serviceRegistration->viewPricingPlans();

            return response()->json([
                'success' => 'Planos de preços retornados com sucesso!',
                'pricingPlans' => $pricingPlans,  
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }


/**
 * @OA\Get(
 *     path="/api/singlePricingPlan/{id}",
 *     summary="Realiza o retorno de um plano de preços específico.",
 *     tags={"Gerenciamento de Planos de Preços"},
 *     @OA\Response(
 *         response=200,
 *         description="Plano de preços retornado com sucesso!"
 *     ),
 *      @OA\Response(
 *         response=401,
 *         description="Plano de preços não encontrado!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function singlePricingPlan($idPricingPlan): JsonResponse {
        try {

            $this->serviceValidation->searchPricingPlan($idPricingPlan);

            $pricingPlan = $this->serviceRegistration->viewSinglePricingPlan($idPricingPlan);

            return response()->json([
                'success' => 'Plano de preços retornado com sucesso!',
                'pricingPlan' => $pricingPlan,  
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }


/**
 * @OA\Post(
 *     path="/api/registerPricingPlan",
 *     summary="Realiza o registro do plano de preços.",
 *     tags={"Gerenciamento de Planos de Preços"},
 *     @OA\Response(
 *         response=201,
 *         description="Registro realizado com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Plano de preços já cadastrado!"
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
    public function registerPricingPlan(PricingPlanRegistrationRequest $request): JsonResponse {
        try {

            $this->serviceValidation->verificationRegisterPricingPlans($request, null);

            $pricingPlan = $this->serviceRegistration->createPricingPlan($request);

            return response()->json([
                'success' => 'Registro realizado com sucesso!',
                'pricingPlan' => $pricingPlan,  
            ], 201);        

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (ValidationException $e) {

            return response()->json([
                'warning' => 'Erro de validação!',
                'errors'  => $e->errors(),
            ], 422);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }


/**
 * @OA\Put(
 *     path="/api/updatePricingPlan/{id}",
 *     summary="Realiza a atualização de dados cadastrais de um plano de preços registrado.",
 *     tags={"Gerenciamento de Planos de Preços"},
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
 *         description="Plano de preços não encontrado!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Já existe um plano de preços cadastrado com esses dados!"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação!"
 *     ),
 * )
 */
    public function updateRecord(PricingPlanRegistrationRequest $request, $idPricingPlan): JsonResponse  {
        try {
            
            $this->serviceValidation->searchPricingPlan($idPricingPlan);

            $this->serviceValidation->verificationRegisterPricingPlans($request, $idPricingPlan);

            $updatedPricingPlan = $this->serviceRegistration->updatePricingPlan($request, $idPricingPlan);

            return response()->json([
                'success' => 'Atualização realizada com sucesso!',
                'pricingPlan' => $updatedPricingPlan
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);
            
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
 *     path="/api/deletePricingPlan/{id}",
 *     summary="Realiza a exclusão do plano de preços selecionado do banco de dados",
 *     tags={"Gerenciamento de Planos de Preços"},
 *     @OA\Response(
 *         response=200,
 *         description="Excluído com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Plano de preços não encontrado!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 * )
 */
    public function deleteRecord($idPricingPlan): JsonResponse {
        try{

            $this->serviceValidation->searchPricingPlan($idPricingPlan);

            $deletedPricingPlan = $this->serviceRegistration->deletePricingPlan($idPricingPlan);

            return response()->json([
                'success' => 'Excluído com sucesso!',
                'pricingPlan' => $deletedPricingPlan,
                'status' => 'Deletado.'
            ], 200); 

        } catch (HttpException $e) {
   
            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {
  
            return response()->json([
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }
    }


    /**
 * @OA\Put(
 *     path="/api/activateDeactivatePricingPlans/{id}",
 *     summary="Realiza a ativação ou desativação do plano de preço selecionado",
 *     tags={"Gerenciamento de Planos de Preços"},
 *     @OA\Response(
 *         response=200,
 *         description="Atualizado com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Plano de preços não encontrado!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 * )
 */
    public function activateDeactivatePricingPlans($idPricingPlan): JsonResponse {
        try{

            $this->serviceValidation->searchPricingPlan($idPricingPlan);

            $updatedPricingPlan = $this->serviceRegistration->activateDeactivatePricingPlans($idPricingPlan);

            return response()->json([
                'success' => 'Atualizado com sucesso!',
                'pricingPlan' => $updatedPricingPlan,
                'status' => 'Atualizado.'
            ], 200); 

        } catch (HttpException $e) {
   
            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {
  
            return response()->json([
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }
    }

}