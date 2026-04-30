<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User\User;
use App\Models\Account\Account;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $user = User::withTrashed()->updateOrCreate(
                ['v_email' => 'admin@admin.com'],
                [
                    'v_name'               => 'Admin',
                    'b_email_verified'     => true,
                    'v_document'           => '00000000000',
                    'v_phone'              => '00000000000',
                    'e_role'               => 'ADMIN',
                    'b_banned'             => false,
                    'e_approval_status'    => 'APPROVED',
                    'b_is_courtesy'        => false,
                    'e_subscriptionStatus' => 'ACTIVE',
                    'b_mustChangePassword' => false,
                    'b_twoFactorEnabled'   => false,
                    'deleted_at'           => null,
                ]
            );

            Account::withTrashed()->updateOrCreate(
                ['i_user_id' => $user->i_id],
                [
                    'i_provider_id' => 0,
                    'v_password'    => Hash::make('12345678'),
                    'deleted_at'    => null,
                ]
            );
        });
    }
}
