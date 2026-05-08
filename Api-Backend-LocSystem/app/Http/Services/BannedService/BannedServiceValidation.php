<?php

namespace App\Http\Services\BannedService;

use App\Models\User\User;
use Symfony\Component\HttpKernel\Exception\HttpException;


class BannedServiceValidation {
    
    protected $modelUser;

    // Método Construtor
    public function __construct(User $modelUser) {
        $this->modelUser = $modelUser;
    }


    // Método para validar se o usuário banido existe
    public function searchBanned($idUser): User {
        $banned = $this->modelUser->where('i_id', $idUser)
                    ->where('b_banned', true)
                    ->whereNull('deleted_at')
                    ->first();

        if (!$banned) {
            throw new HttpException(401, 'Usuário banido não encontrado!');
        }   

        return $banned; 
    }   
}