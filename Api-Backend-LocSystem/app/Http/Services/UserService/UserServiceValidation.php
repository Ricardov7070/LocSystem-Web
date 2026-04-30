<?php

namespace App\Http\Services\UserService;

use App\Models\User\User;
use Symfony\Component\HttpKernel\Exception\HttpException;


class UserServiceValidation {

    protected $modelUser;

    // Método Construtor
    public function __construct(User $modelUser) {
        $this->modelUser = $modelUser;
    }

    
    // Método de validação existencial de dados do usuário para cadastro sem duplicidade
    public function checkUserRegistration($request, $ignoreId = null): void {
        $exactUserQuery = $this->modelUser->where('v_name', $request->input('v_name'))
                                        ->where('v_email', $request->input('v_email'))
                                        ->whereNull('deleted_at');

        if ($ignoreId) {
            $exactUserQuery->where('i_id', '!=', $ignoreId);
        }

        if ($exactUserQuery->exists()) {
            throw new HttpException(409, 'Usuário já cadastrado!');
        }

        $emailQuery = $this->modelUser->where('v_email', $request->input('v_email'))
                                    ->whereNull('deleted_at');

        if ($ignoreId) {
            $emailQuery->where('i_id', '!=', $ignoreId);
        }

        if ($emailQuery->exists()) {
            throw new HttpException(409, 'Email já cadastrado com outro usuário!');
        }
    }


    // Método de validação existencial de dados do usuário pelo o email
    public function validateUserForReset($request): User {
        $user = $this->modelUser->where('v_email', $request->input('v_email'))
                                ->where('e_approval_status', 'APPROVED')
                                ->where('b_banned', false)
                                ->whereNull('deleted_at')
                                ->first(); 

        if (!$user) {
            throw new HttpException(401, 'Usuário não encontrado ou Desativado!');
        }

        return $user;
    }


    // Método de validação existencial pelo o ID do usuário selecionado para update
    public function searchUser ($id_user): void {      
        $user = $this->modelUser::where('i_id', $id_user)
            ->where('e_approval_status', 'APPROVED')
            ->where('b_banned', false)
            ->whereNull('deleted_at')
            ->first();

        if (!$user) {
            throw new HttpException(401, 'Usuário não encontrado ou Desativado!');
        }
    } 

}