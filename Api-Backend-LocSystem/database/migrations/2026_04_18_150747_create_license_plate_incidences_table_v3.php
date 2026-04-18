<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateLicensePlateIncidencesTableV3 extends Migration
{
    public function up(): void
    {
        Schema::create('license_plate_incidences', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_plate');
            $table->string('v_location')->nullable();
            $table->double('f_latitude')->nullable();
            $table->double('f_longitude')->nullable();
            $table->string('v_image')->nullable();
            $table->boolean('b_positive')->default(true);

            $table->enum('e_capture_method', [
                'MANUAL',
                'CAMERA',
                'EXTERNAL_CAMERA'
            ])->default('MANUAL');

            $table->string('v_plate_mercosul')->nullable();

            $table->foreignId('i_user_id')
                ->constrained('users', 'i_id')
                ->onDelete('restrict');

            $table->foreignId('i_vehicle_id')
                ->nullable()
                ->constrained('vehicles', 'i_id')
                ->onDelete('set null');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('license_plate_incidences');
    }
}