<?php

namespace App\Http\Services\WalletService;

use App\Models\Wallet\Wallet;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpKernel\Exception\HttpException;


class WalletValidationService {

    protected $modelWallet;

    // Método Construtor
    public function __construct (Wallet $modelWallet) {
        $this->modelWallet = $modelWallet;
    }


    // Método para verificar se a carteira existe no sistema através de seu ID
    public function searchWallet ($idWallet): void {
        $wallet = $this->modelWallet::where('i_id', $idWallet)
                                        ->whereNull('deleted_at')
                                        ->first();

        if (!$wallet) {
            throw new HttpException(401, 'Carteira não encontrada!');
        }
    }

}