<?php

namespace App\Http\Services\BannedService;

use App\Models\User\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use App\Http\Services\LogsService\LogsService;


class BannedService {

    protected $modelUser;
    protected $logsService;

    // Método Construtor
    public function __construct(User $modelUser, LogsService $logsService) {
        $this->modelUser = $modelUser;
        $this->logsService = $logsService;
    }


    // Método para Visualizar os Usuários Banidos
    public function viewBanneds(): Collection {
        return $this->modelUser
            ->where('b_banned', true)
            ->whereNull('deleted_at')
            ->get();
    }   


    // Método de Atualização de Usuário Banido
    public function updateUserBanned($userId): void  {
        DB::transaction(function () use ($userId) {

            $user = $this->modelUser->findOrFail($userId);

            $user->update([
                'b_banned'  => false,
                't_ban_reason'  => null,
                'd_ban_expires'  => null,
                'd_ban_when'  => null,
            ]);

        });

        $this->logsService->createLog(
            auth()->id(),
            'Atualização de Usuário Banido',
            ['user_id' => $userId],
            'Usuário desbanido com sucesso'
        );

    }
}