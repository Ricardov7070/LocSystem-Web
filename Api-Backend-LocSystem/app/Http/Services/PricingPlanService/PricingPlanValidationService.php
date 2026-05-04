<?php

namespace App\Http\Services\PricingPlanService;

use App\Models\PricingPlan\PricingPlan;
use Symfony\Component\HttpKernel\Exception\HttpException;


class PricingPlanValidationService {

    protected $modelPricingPlan;

    // Método Construtor
    public function __construct(PricingPlan $modelPricingPlan) {
        $this->modelPricingPlan = $modelPricingPlan;
    }


    // Método para verificar se já existe um plano de preços igualizado na base de dados
    public function verificationRegisterPricingPlans($request, $idPricingPlan = null): void {
        $query = $this->modelPricingPlan::where('v_name', $request->input('v_name'))
                                    ->where('f_operator_price', $request->input('f_operator_price'))
                                    ->where('f_preposto_price', $request->input('f_preposto_price'))
                                    ->where('b_is_active', $request->input('b_is_active'))
                                    ->whereNull('deleted_at');

        if ($idPricingPlan) {
            $query->where('i_id', '!=', $idPricingPlan);
        }

        $pricingPlanExists = $query->first();

        if ($pricingPlanExists) {
            throw new HttpException(409, $idPricingPlan ? 'Já existe um plano de preços cadastrado com esses dados!' : 'Plano de preços já cadastrado!');
        }
    }


    // Método para verificar se o plano de preços existe no sistema através de seu ID
    public function searchPricingPlan($idPricingPlan): void {
        $pricingPlan = $this->modelPricingPlan::where('i_id', $idPricingPlan)
                                        ->whereNull('deleted_at')
                                        ->first();

        if (!$pricingPlan) {
            throw new HttpException(401, 'Plano de preços não encontrado!');
        }
    }

}