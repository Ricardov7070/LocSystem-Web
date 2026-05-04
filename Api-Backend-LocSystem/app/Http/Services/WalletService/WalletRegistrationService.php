<?php

namespace App\Http\Services\WalletService;

use App\Models\Wallet\Wallet;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;


class WalletRegistrationService {

    protected $modelWallet;

    // Método Construtor
    public function __construct(Wallet $modelWallet) {
        $this->modelWallet = $modelWallet;
    }


    // Método para visualizar as carteiras cadastradas
    public function viewWallets(): Collection {
        return Cache::remember('wallets_list', 30, function () {
            return $this->modelWallet->whereNull('deleted_at')->get();
        });
    }


    // Método para visualizar uma carteira específica através de seu ID
    public function viewSingleWallet($idWallet): array {
        $wallet = $this->modelWallet::where('i_id', $idWallet)
                                        ->whereNull('deleted_at')
                                        ->first();

        return $wallet ? $wallet->toArray() : [];
    }


     // Método para cadastrar uma nova carteira
    public function createWallet($request, $i_user_id): array  {
        return DB::transaction(function () use ($request, $i_user_id) {

            $wallet = $this->modelWallet::create([
                'v_name'              => $request->input('v_name'),
                'i_user_id'           => $i_user_id,
            ]);

            return $wallet->toArray();

        });
    }

    
    // Método para atualizar uma carteira
    public function updateWallet($request, $walletId, $i_user_id): array {
        return DB::transaction(function () use ($request, $walletId, $i_user_id) {

            $wallet = $this->modelWallet->findOrFail($walletId);

            $wallet->update([
                'v_name'              => $request->input('v_name'),
                'i_user_id'           => $i_user_id,    
            ]);

            return $wallet->refresh()->toArray();

        });
    }


    // Método para deletar uma carteira
    public function deleteWallet($idWallet): array {
        $wallet = $this->modelWallet::where('i_id', $idWallet)
                                        ->whereNull('deleted_at')
                                        ->first();

        if ($wallet) {

            $wallet->delete();

            return $wallet->toArray();
            
        }

        return [];
    }
}