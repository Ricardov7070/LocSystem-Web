<?php

namespace App\Http\Controllers\Wallet;

use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\WalletManagementRequests\WalletRegistrationRequest;
use App\Http\Services\WalletService\WalletRegistrationService;
use App\Http\Services\WalletService\WalletValidationService;


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
    public function wallets(): JsonResponse {
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
    public function singleWallet($idWallet): JsonResponse {
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
 *     path="/api/registerWallet",
 *     summary="Realiza o registro da carteira.",
 *     tags={"Gerenciamento de Carteiras"},
 *     @OA\Response(
 *         response=201,
 *         description="Registro realizado com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Carteira já cadastrada!"
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
    public function registerWallet(WalletRegistrationRequest $request): JsonResponse {
        try {

            $this->serviceValidation->verificationRegisterWallets($request, null);

            $wallet = $this->serviceRegistration->createWallet($request, auth()->id());

            return response()->json([
                'success' => 'Registro realizado com sucesso!',
                'wallet' => $wallet,  
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
 *     path="/api/updateWallet/{id}",
 *     summary="Realiza a atualização de dados cadastrais de uma carteira registrada.",
 *     tags={"Gerenciamento de Carteiras"},
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
 *         description="Carteira não encontrada!"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Carteira já cadastrada para outro usuário!"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação!"
 *     ),
 * )
 */
    public function updateRecord(WalletRegistrationRequest $request, $idWallet): JsonResponse  {
        try {
            
            $this->serviceValidation->searchWallet($idWallet);

            $this->serviceValidation->verificationRegisterWallets($request, $idWallet);

            $updatedWallet = $this->serviceRegistration->updateWallet($request, $idWallet, auth()->id());

            return response()->json([
                'success' => 'Atualização realizada com sucesso!',
                'wallet' => $updatedWallet
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
 *     path="/api/deleteWallet/{id}",
 *     summary="Realiza a exclusão da carteira selecionada do banco de dados",
 *     tags={"Gerenciamento de Carteiras"},
 *     @OA\Response(
 *         response=200,
 *         description="Excluído com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Carteira não encontrada!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro, tente novamente!"
 *     ),
 * )
 */
    public function deleteRecord($idWallet): JsonResponse {
        try{

            $this->serviceValidation->searchWallet($idWallet);

            $deletedWallet = $this->serviceRegistration->deleteWallet($idWallet);

            return response()->json([
                'success' => 'Excluído com sucesso!',
                'wallet' => $deletedWallet,
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

}