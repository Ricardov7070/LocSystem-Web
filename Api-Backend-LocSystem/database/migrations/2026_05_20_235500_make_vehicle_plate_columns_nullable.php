<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement('ALTER TABLE vehicles MODIFY v_plate VARCHAR(255) NULL');
        DB::statement('ALTER TABLE vehicles MODIFY v_plate_mercosul VARCHAR(255) NULL');
    }

    public function down(): void
    {
        DB::statement("UPDATE vehicles SET v_plate = CONCAT('__legacy_plate_', i_id) WHERE v_plate IS NULL");
        DB::statement("UPDATE vehicles SET v_plate_mercosul = CONCAT('__legacy_merc_', i_id) WHERE v_plate_mercosul IS NULL");
        DB::statement('ALTER TABLE vehicles MODIFY v_plate VARCHAR(255) NOT NULL');
        DB::statement('ALTER TABLE vehicles MODIFY v_plate_mercosul VARCHAR(255) NOT NULL');
    }
};