<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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
            $user = User::create([
                'v_name'               => 'Admin',
                'v_email'              => 'admin@admin.com',
                'b_email_verified'     => 1,
                'v_document'           => '00000000000',
                'v_phone'              => '00000000000',
                'e_role'               => 'ADMIN',
                'b_banned'             => false,
                'e_approval_status'    => 'APPROVED',
                'b_is_courtesy'        => 0,
                'e_subscriptionStatus' => 'ACTIVE',
                'b_mustChangePassword' => false,
                'b_twoFactorEnabled'   => false
            ]);

            Account::create([
                'i_user_id'     => $user->i_id,
                'i_provider_id' => 0,
                'v_password'    => Hash::make('12345678'),
            ]);
        });
    }
}
