<?php

namespace App\Http\Services\WalletService;

use App\Models\Wallet\Wallet;
use App\Support\ApiCacheKey;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Http\Services\LogsService\LogsService;


class WalletRegistrationService {

    protected $modelWallet;
    protected $logsService;

    // Método Construtor
    public function __construct(Wallet $modelWallet, LogsService $logsService) {
        $this->modelWallet = $modelWallet;
        $this->logsService = $logsService;
    }


    // Método para visualizar as carteiras cadastradas
    public function viewWallets(): Collection {
        return Cache::store('redis')->remember(ApiCacheKey::forUser('wallets_list'), 30, function () {
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
        $wallet = DB::transaction(function () use ($request, $i_user_id) {

            $wallet = $this->modelWallet::create([
                'v_name'              => $request->input('v_name'),
                'i_user_id'           => $i_user_id,
            ]);

            return $wallet->toArray();

        });

        $this->logsService->createLog(
            $i_user_id,
            'Criação de Carteira',
            $wallet,
            'Carteira criada com sucesso'
        );

        return $wallet;
    }

    
    // Método para atualizar uma carteira
    public function updateWallet($request, $walletId, $i_user_id): array {
        $wallet = DB::transaction(function () use ($request, $walletId, $i_user_id) {

            $wallet = $this->modelWallet->findOrFail($walletId);

            $wallet->update([
                'v_name'              => $request->input('v_name'),
                'i_user_id'           => $i_user_id,    
            ]);

            return $wallet->refresh()->toArray();

        });

        $this->logsService->createLog(
            $i_user_id,
            'Atualização de Carteira',
            $wallet,
            'Carteira atualizada com sucesso'
        );

        return $wallet;
    }


    // Método para deletar uma carteira
    public function deleteWallet($idWallet): array {
        $wallet = $this->modelWallet::where('i_id', $idWallet)
                                        ->whereNull('deleted_at')
                                        ->first();

        if ($wallet) {

            $walletData = $wallet->toArray();

            $wallet->delete();

            $this->logsService->createLog(
                auth()->id(),
                'Exclusão de Carteira',
                $walletData,
                'Carteira deletada com sucesso'
            );

            return $walletData;
            
        }

        return [];
    }
}