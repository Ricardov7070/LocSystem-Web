<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_name');
            $table->string('v_email')->unique();
            $table->boolean('b_email_verified');
            $table->string('v_image')->nullable();
            $table->string('v_document')->nullable();
            $table->string('v_phone')->nullable();
            $table->enum('e_role', ['ADMIN', 'OPERATOR', 'AUDITOR', 'OLHEIRO', 'LINKED_USER'])->default('AUDITOR');
            $table->boolean('b_banned')->nullable();
            $table->text('t_ban_reason')->nullable();
            $table->dateTime('d_ban_expires')->nullable(); 
            $table->dateTime('d_ban_when')->nullable();
            $table->text('t_approval_reason')->nullable();
            $table->enum('e_approval_status', ['PENDING', 'APPROVED', 'REJECTED'])->nullable();
            $table->dateTime('d_approved_at')->nullable();
            $table->string('v_approved_by')->nullable();
            $table->integer('i_auditor_id')->nullable();
            $table->integer('i_device_id')->nullable();
            $table->dateTime('d_device_last_seen')->nullable();
            $table->string('v_device_name')->nullable();
            $table->dateTime('d_device_registered_at')->nullable();
            $table->boolean('b_is_courtesy')->default(false);
            $table->integer('i_operator_id')->nullable();
            $table->integer('i_pricing_plan_id')->nullable();
            $table->integer('i_user_limit')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('e_role', 'idx_user_role');
            $table->index(['e_role', 'i_id'], 'idx_user_role_id');
            $table->index('i_operator_id', 'idx_user_operator_relation');
            $table->index('i_auditor_id', 'idx_user_auditor_relation');
            $table->index('i_device_id', 'idx_user_device');
            $table->index('e_approval_status', 'idx_user_approval_status');
            $table->index('v_approved_by', 'user_approvedBy_fkey');
            $table->index('i_pricing_plan_id', 'user_pricingPlanId_fkey');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};