<?php

namespace App\Http\Services\WalletService;

use App\Models\Wallet\Wallet;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;


class WalletRegistrationService {

    protected $modelWallet;

    // Método Construtor
    public function __construct (Wallet $modelWallet) {
        $this->modelWallet = $modelWallet;
    }


    // Método para visualizar as carteiras cadastradas
    function viewWallets (): Collection {
        return Cache::remember('wallets_list', 60, function () {
            return $this->modelWallet->whereNull('deleted_at')->get();
        });
    }

}