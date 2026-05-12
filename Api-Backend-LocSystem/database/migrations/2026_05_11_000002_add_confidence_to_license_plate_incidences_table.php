<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('license_plate_incidences', function (Blueprint $table) {
            $table->double('f_confidence')->nullable()->after('v_image');
        });
    }

    public function down(): void
    {
        Schema::table('license_plate_incidences', function (Blueprint $table) {
            $table->dropColumn('f_confidence');
        });
    }
};
