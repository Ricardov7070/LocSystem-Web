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

    public function __construct(IncidenceService $service)
    {
        $this->service = $service;
    }

    public function history(Request $request): JsonResponse
    {
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

    public function historyCount(Request $request): JsonResponse
    {
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

    public function historyShow(Request $request, $id): JsonResponse
    {
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

    public function historyDelete(Request $request, $id): JsonResponse
    {
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

    public function retroactive(Request $request): JsonResponse
    {
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

    public function retroactiveCount(Request $request): JsonResponse
    {
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

    public function retroactiveShow(Request $request, $id): JsonResponse
    {
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

    public function retroactiveMarkAsRead(Request $request, $id): JsonResponse
    {
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

    public function retroactiveDelete(Request $request, $id): JsonResponse
    {
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