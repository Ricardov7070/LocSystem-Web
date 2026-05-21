<?php

namespace App\Http\Services\LegalAdvisoryService;

use App\Models\LegalAdvisory\LegalAdvisory;
use App\Models\Wallet\Wallet;
use Symfony\Component\HttpKernel\Exception\HttpException;

class LegalAdvisoryValidationService
{
    protected $modelLegalAdvisory;
    protected $modelWallet;

    // Método Construtor
    public function __construct(LegalAdvisory $modelLegalAdvisory, Wallet $modelWallet) {
        $this->modelLegalAdvisory = $modelLegalAdvisory;
        $this->modelWallet = $modelWallet;
    }


    // Método para validar os dados de criação ou atualização de uma assessoria jurídica, garantindo que não haja duplicidade de nome e documento.
    public function verificationRegisterLegalAdvisories($request, $idLegalAdvisory = null): void {
        $query = $this->modelLegalAdvisory::where('v_name', $request->input('v_name'))
            ->where('v_document', $request->input('v_document'))
            ->whereNull('deleted_at');

        if ($idLegalAdvisory) {
            $query->where('i_id', '!=', $idLegalAdvisory);
        }

        if ($query->exists()) {
            throw new HttpException(
                409,
                $idLegalAdvisory
                    ? 'Já existe uma assessoria com este nome e documento!'
                    : 'Assessoria já cadastrada!'
            );
        }
    }


    // Método para validar a existência de uma assessoria jurídica específica, garantindo que ela exista antes de realizar operações de leitura, atualização ou exclusão.
    public function searchLegalAdvisory($idLegalAdvisory): void {
        $legalAdvisory = $this->modelLegalAdvisory::where('i_id', $idLegalAdvisory)
            ->whereNull('deleted_at')
            ->first();

        if (!$legalAdvisory) {
            throw new HttpException(401, 'Assessoria não encontrada!');
        }
    }


    // Método para validar a existência de uma carteira específica, garantindo que ela exista antes de associá-la a uma assessoria jurídica.
    public function ensureWalletExists(?int $walletId): void {
        if (!$walletId) {
            return;
        }

        $wallet = $this->modelWallet::where('i_id', $walletId)
            ->whereNull('deleted_at')
            ->first();

        if (!$wallet) {
            throw new HttpException(401, 'Carteira não encontrada!');
        }
    }


    // Método para validar se uma assessoria jurídica pode ser excluída, verificando se existem veículos associados a ela.
    public function ensureCanDelete(int $idLegalAdvisory): void {
        $hasVehicles = $this->modelLegalAdvisory::where('i_id', $idLegalAdvisory)
            ->whereNull('legal_advisories.deleted_at')
            ->whereHas('accesses.vehicles', function ($query) {
                $query->whereNull('vehicles.deleted_at');
            })
            ->exists();

        if ($hasVehicles) {

            throw new HttpException(
                409,
                'Não é possível excluir esta assessoria pois existem veículos associados.'
            );

        }
    }
}
