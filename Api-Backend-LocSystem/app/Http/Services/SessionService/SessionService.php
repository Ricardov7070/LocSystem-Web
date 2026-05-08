<?php

namespace App\Http\Services\SessionService;

use App\Models\Session\Session;
use App\Models\User\User;
use Illuminate\Database\Eloquent\Collection;


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
        return $this->modelUser
            ->select(
                'users.i_id',
                'users.v_name',
                'users.v_email',
                'users.e_role',
                'users.v_device_name',
                'users.i_device_id',
                'users.v_device_country',
                'users.d_device_last_seen',
                'users.d_device_registered_at',
                'sessions.d_expires_at'
            )
            ->join('sessions', 'users.i_id', '=', 'sessions.i_user_id')
            ->whereNull('users.deleted_at')
            ->whereNull('sessions.deleted_at')
            ->whereNotNull('sessions.v_token')
            ->get();
    }   

}