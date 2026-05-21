<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdvisoryUserManagementRequests\AdvisoryUserChangePasswordRequest;
use App\Http\Requests\AdvisoryUserManagementRequests\AdvisoryUserStoreRequest;
use App\Http\Requests\AdvisoryUserManagementRequests\AdvisoryUserToggleStatusRequest;
use App\Http\Requests\AdvisoryUserManagementRequests\AdvisoryUserUpdateRequest;
use App\Http\Services\AdvisoryUserService\AdvisoryUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdvisoryUserController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(AdvisoryUserService $service)
    {
        $this->service = $service;
    }

    public function list(Request $request): JsonResponse
    {
        try {
            $this->ensureAdmin();
            $users = $this->service->list($request);

            return response()->json([
                'success' => 'Usuários de assessoria retornados com sucesso!',
                'advisoryUsers' => $users,
            ], 200);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    public function findOne($id): JsonResponse
    {
        try {
            $this->ensureAdmin();
            $user = $this->service->findOne((int) $id);

            return response()->json([
                'success' => 'Usuário de assessoria retornado com sucesso!',
                'advisoryUser' => $user,
            ], 200);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    public function create(AdvisoryUserStoreRequest $request): JsonResponse
    {
        try {
            $this->ensureAdmin();
            $user = $this->service->create($request, (int) auth()->id());

            return response()->json([
                'success' => 'Usuário de assessoria cadastrado com sucesso!',
                'advisoryUser' => $user,
            ], 201);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    public function update(AdvisoryUserUpdateRequest $request, $id): JsonResponse
    {
        try {
            $this->ensureAdmin();
            $user = $this->service->update($request, (int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Usuário de assessoria atualizado com sucesso!',
                'advisoryUser' => $user,
            ], 200);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    public function delete($id): JsonResponse
    {
        try {
            $this->ensureAdmin();
            $result = $this->service->delete((int) $id, (int) auth()->id());

            return response()->json([
                'success' => 'Usuário de assessoria removido com sucesso!',
                'advisoryUser' => $result,
            ], 200);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    public function toggleStatus(AdvisoryUserToggleStatusRequest $request, $id): JsonResponse
    {
        try {
            $this->ensureAdmin();
            $user = $this->service->toggleStatus((int) $id, (bool) $request->input('isActive'), (int) auth()->id());

            return response()->json([
                'success' => 'Status do usuário atualizado com sucesso!',
                'advisoryUser' => $user,
            ], 200);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    public function changePassword(AdvisoryUserChangePasswordRequest $request, $id): JsonResponse
    {
        try {
            $this->ensureAdmin();
            $result = $this->service->changePassword((int) $id, (string) $request->input('v_password'), (int) auth()->id());

            return response()->json([
                'success' => 'Senha alterada com sucesso!',
                'advisoryUser' => $result,
            ], 200);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    public function resetTwoFactor($id): JsonResponse
    {
        try {
            $this->ensureAdmin();
            $result = $this->service->resetTwoFactor((int) $id, (int) auth()->id());

            return response()->json([
                'success' => '2FA resetado com sucesso!',
                'advisoryUser' => $result,
            ], 200);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    public function myTenants(): JsonResponse
    {
        try {
            $user = auth()->user();
            if ($user->e_role !== 'AUDITOR') {
                throw new HttpException(401, 'Apenas usuários de assessoria podem acessar seus tenants.');
            }

            $tenants = $this->service->myTenants((int) $user->i_id);

            return response()->json([
                'success' => 'Tenants retornados com sucesso!',
                'tenants' => $tenants,
            ], 200);
        } catch (HttpException $e) {
            return $this->httpExceptionResponse($e);
        } catch (\Throwable $th) {
            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
        }
    }

    protected function ensureAdmin(): void
    {
        $user = auth()->user();

        if (!$user || $user->e_role !== 'ADMIN') {
            throw new HttpException(401, 'Apenas administradores podem gerenciar usuários de assessoria.');
        }
    }
}
