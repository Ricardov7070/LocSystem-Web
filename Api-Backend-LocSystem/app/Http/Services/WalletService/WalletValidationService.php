<?php

namespace App\Http\Services\WalletService;

use App\Models\Wallet\Wallet;
use Symfony\Component\HttpKernel\Exception\HttpException;


class WalletValidationService {

    protected $modelWallet;

    // Método Construtor
    public function __construct(Wallet $modelWallet) {
        $this->modelWallet = $modelWallet;
    }


    // Método para verificar se a carteira já possui cadastro na base através de seu nome
    public function verificationRegisterWallets($request, $idWallet = null): void {
        $query = $this->modelWallet::where('v_name', $request->input('v_name'))
                                    ->whereNull('deleted_at');

        if ($idWallet) {
            $query->where('i_id', '!=', $idWallet);
        }

        $walletExists = $query->first();

        if ($walletExists) {
            throw new HttpException(409, $idWallet ? 'Já existe uma carteira com este nome!' : 'Carteira já cadastrada!');
        }
    }


    // Método para verificar se a carteira existe no sistema através de seu ID
    public function searchWallet($idWallet): void {
        $wallet = $this->modelWallet::where('i_id', $idWallet)
                                        ->whereNull('deleted_at')
                                        ->first();

        if (!$wallet) {
            throw new HttpException(401, 'Carteira não encontrada!');
        }
    }

}