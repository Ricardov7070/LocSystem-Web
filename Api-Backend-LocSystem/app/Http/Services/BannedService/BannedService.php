<?php

namespace App\Http\Services\BannedService;

use App\Models\User\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;


class BannedService {

    protected $modelUser;

    // Método Construtor
    public function __construct(User $modelUser) {
        $this->modelUser = $modelUser;
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

    }
}