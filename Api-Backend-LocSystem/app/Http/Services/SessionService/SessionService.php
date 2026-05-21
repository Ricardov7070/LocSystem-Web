<?php

namespace App\Http\Services\SessionService;

use App\Models\Session\Session;
use App\Models\User\User;
use App\Support\ApiCacheKey;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;


class SessionService {

    protected $modelSession;
    protected $modelUser;

    // Método Construtor
    public function __construct(Session $modelSession, User $modelUser) {
        $this->modelSession = $modelSession;
        $this->modelUser = $modelUser;
    }


    // Método para Visualizar as Sessões
    public function viewSessions(): Collection {
        return Cache::store('redis')->remember(ApiCacheKey::forUser('sessions_list'), 30, function () {
            return $this->modelUser
                ->select(
                    'sessions.i_id',
                    'users.i_id as i_user_id',
                    'users.v_name',
                    'users.v_email',
                    'users.e_role',
                    'users.v_device_name',
                    'users.i_device_id',
                    'users.v_device_country',
                    'users.d_device_last_seen',
                    'sessions.created_at',
                    'sessions.d_expires_at'
                )
                ->join('sessions', 'users.i_id', '=', 'sessions.i_user_id')
                ->whereNull('users.deleted_at')
                ->whereNull('sessions.deleted_at')
                ->whereNotNull('sessions.v_token')
                ->get();
        });
    }   

}