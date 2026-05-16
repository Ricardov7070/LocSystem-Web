<?php

namespace App\Http\Controllers\Session;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Services\SessionService\SessionService;
use App\Http\Services\UserService\UserServiceAuthentication;
use App\Models\User\User;


class SessionController extends Controller {

    protected $serviceSession;
    protected $serviceAuthentication;

    // Método Construtor
    public function __construct(SessionService $serviceSession, UserServiceAuthentication $serviceAuthentication) {
        $this->serviceSession = $serviceSession;
        $this->serviceAuthentication = $serviceAuthentication;
    }
  

/**
 * @OA\Get(
 *     path="/api/sessions",
 *     summary="Realiza o retorno das sessões ativas.",
 *     tags={"Gerenciamento de Sessões"},
 *     @OA\Response(
 *         response=200,
 *         description="Sessões ativas retornadas com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function sessions(): JsonResponse {
        try {

            $sessions = $this->serviceSession->viewSessions();

            return response()->json([
                'success' => 'Sessões ativas retornadas com sucesso!',
                'sessions' => $sessions,  
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => "Ocorreu um erro inesperado, tente novamente!",
            ], 500);

        }
    }


/**
 * @OA\Post(
 *     path="/api/singleSession/{id}",
 *     summary="Realiza o encerramento de sessões de usuários específicos.",
 *     tags={"Gerenciamento de Sessões"},
 *     @OA\Response(
 *         response=200,
 *         description="Sessão'es encerrada's com sucesso!"
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado, tente novamente!"
 *     ),
 * )
 */
    public function singleSession(Request $request): JsonResponse
    {
        try {

            foreach ($request['ids'] as $id) {
                $user = User::find($id);

                if ($user) {
                    $this->serviceAuthentication->logout($user);
                }
            }

            return response()->json([
                'success' => "Sessão'es encerrada's com sucesso!",
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => $th->getMessage(),
            ], 500);

        }
    }

}