<?php

namespace App\Http\Services\LogsService;

use App\Models\UserLog\UserLog;
use App\Support\ApiCacheKey;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

class LogsService {
    protected const MAX_LIST_LIMIT = 500;

    protected $modelLog;

    // Método Construtor
    public function __construct(UserLog $modelLog) {
        $this->modelLog = $modelLog;
    }


    // Método para visualizar todos os logs cadastrados
    public function viewLogs(): Collection {
        return Cache::store('redis')->remember(ApiCacheKey::forUser('logs_list'), 30, function () {
            return $this->modelLog->query()
                ->select(['i_id', 'i_user_id', 'v_action', 'j_details', 'v_description', 'created_at'])
                ->whereNull('deleted_at')
                ->orderByDesc('created_at')
                ->orderByDesc('i_id')
                ->limit(self::MAX_LIST_LIMIT)
                ->get();
        });
    }


    // Método para cadastrar um novo log
    public function createLog($i_user_id, string $v_action = '', array $j_details = [], string $v_description = ''): array  {
        if (!$i_user_id) {
            return [];
        }

        return DB::transaction(function () use ($i_user_id, $v_action, $j_details, $v_description) {

            $log = $this->modelLog::create([
                'i_user_id'           => $i_user_id,
                'v_action'            => $v_action,
                'j_details'           => $j_details,
                'v_description'       => $v_description,
            ]);

            return $log->toArray();

        });
    }

}