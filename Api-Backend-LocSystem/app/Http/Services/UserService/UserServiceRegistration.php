<?php

namespace App\Http\Services\UserService;

use App\Models\User\User;
use App\Models\Account\Account;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;


class UserServiceRegistration {

    protected $modelUser;
    protected $modelAccount;

    // Método Construtor
    public function __construct (User $modelUser, Account $modelAccount) {
        $this->modelUser = $modelUser;
        $this->modelAccount = $modelAccount;
    }


    // Método Cadastro de Usuário
    public function createUser($request): array {
        return DB::transaction(function () use ($request) {

            $user = $this->modelUser->create([
                'v_name'               => $request->input('v_name'),
                'v_email'              => $request->input('v_email'),
                'b_email_verified'     => 0,
                'v_document'           => $request->input('v_document'),
                'v_phone'              => $request->input('v_phone'),
                'e_role'               => $request->input('e_role'),
                'b_banned'             => false,
                'e_approval_status'    => 'PENDING',
                'b_is_courtesy'        => 0,
                'e_subscriptionStatus' => 'INACTIVE',
                'b_mustChangePassword' => false,
                'b_twoFactorEnabled'   => false
            ]);

            $this->modelAccount->create([
                'i_user_id'     => $user->i_id,
                'i_provider_id' => 0,
                'v_password'    => Hash::make($request->input('v_password')),
            ]);
        
            return [
                'v_name' => $user->v_name,
            ];

        });
    }


    // Método de Atualização de Usuário
    public function updateUser($request, $userId): array  {
        return DB::transaction(function () use ($request, $userId) {

            $user = $this->modelUser->findOrFail($userId);

            $user->update([
                'v_name'  => $request->input('v_name'),
                'v_email' => $request->input('v_email'),
                'v_phone' => $request->input('v_phone'),
            ]);

            if ($request->has('v_password')) {
                $account = $this->modelAccount->where('i_user_id', $user->i_id)->whereNull('deleted_at')->first();

                if ($account) {

                    $account->update([
                        'v_password' => Hash::make($request->input('v_password'))
                    ]);

                }
            }

            return [
                'v_name' => $user->v_name,
            ];

        });
    }


     // Método de Exclusão de Usuário
    public function deleteUser($id_user): array {
        return DB::transaction(function () use ($id_user) {

            $user = $this->modelUser->findOrFail($id_user);

            $userData = [
                'v_name' => $user->v_name,
            ];

            $user->delete();

            return $userData;

        });
    }


    // Método de Upload de Imagem de Perfil
    public function uploadProfileImage($request, $user): string {
        foreach (['jpg', 'jpeg', 'png', 'gif', 'webp'] as $ext) {
            $old = public_path('images/users/' . $user->i_id . '.' . $ext);
            if (file_exists($old)) {
                unlink($old);
            }
        }

        $extension = $request->file('image')->extension();
        $filename  = $user->i_id . '.' . $extension;

        $request->file('image')->move(public_path('images/users'), $filename);

        $imageUrl = $request->getSchemeAndHttpHost() . '/images/users/' . $filename . '?v=' . time();

        $user->update(['v_image' => $imageUrl]);

        return $imageUrl;
    }

}