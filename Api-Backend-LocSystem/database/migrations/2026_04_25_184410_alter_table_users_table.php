<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('users', function (Blueprint $column) {
            $column->enum('e_subscriptionStatus', ['INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
                   ->default('INACTIVE')
                   ->after('v_email'); 

            $column->timestamp('d_subscriptionExpiresAt')->nullable()->after('e_subscriptionStatus');

            $column->boolean('b_mustChangePassword')->default(false)->after('d_subscriptionExpiresAt');

            $column->boolean('b_twoFactorEnabled')->default(false)->after('b_mustChangePassword');
        });
    }


    public function down(): void
    {
        Schema::table('users', function (Blueprint $column) {
            $column->dropColumn([
                'e_subscriptionStatus',
                'd_subscriptionExpiresAt',
                'b_mustChangePassword',
                'b_twoFactorEnabled'
            ]);
        });
    }
    
};