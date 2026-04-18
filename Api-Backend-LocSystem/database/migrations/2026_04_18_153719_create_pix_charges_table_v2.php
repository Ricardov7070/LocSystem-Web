<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pix_charges', function (Blueprint $table) {
            $table->id('i_id', 191);

            $table->string('v_user_id', 191);
            $table->string('v_cora_charge_id', 191);

            $table->integer('i_amount');

            $table->enum('e_status', [
                'PENDING',
                'PAID',
                'EXPIRED',
                'CANCELED'
            ])->default('PENDING');

            $table->text('t_qr_code')->nullable();
            $table->text('t_qr_code_image_url')->nullable();
            $table->text('t_pix_copy_paste')->nullable();

            $table->dateTime('d_expires_at', 3)->nullable();
            $table->dateTime('d_paid_at', 3)->nullable();

            $table->integer('i_subscription_days')->default(30);

            $table->json('j_metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pix_charges');
    }
};