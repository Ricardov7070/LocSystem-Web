<?php

namespace App\Http\Controllers;

use App\Support\ApiErrorStatus;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * @OA\Info(
 *     title="LocSystem API",
 *     version="1.0.0",
 *     description="Documentação da API do sistema LocSystem"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT"
 * )
 */
class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    protected function httpExceptionResponse(HttpException $exception, string $key = 'info'): JsonResponse
    {
        return response()->json([
            $key => $exception->getMessage(),
        ], ApiErrorStatus::normalize($exception->getStatusCode()));
    }
}
