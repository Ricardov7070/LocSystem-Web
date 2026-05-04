<?php

namespace App\Http\Services\PricingPlanService;

use App\Models\PricingPlan\PricingPlan;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;


class PricingPlanRegistrationService {

    protected $modelPricingPlan;

    // Método Construtor
    public function __construct(PricingPlan $modelPricingPlan) {
        $this->modelPricingPlan = $modelPricingPlan;
    }


    // Método para visualizar os planos de preços cadastrados
    public function viewPricingPlans(): Collection {
        return Cache::remember('pricing_plans_list', 30, function () {
            return $this->modelPricingPlan->whereNull('deleted_at')->get();
        });
    }


    // Método para visualizar um plano de preços específico através de seu ID
    public function viewSinglePricingPlan($idPricingPlan): array {
        $pricingPlan = $this->modelPricingPlan::where('i_id', $idPricingPlan)
                                        ->whereNull('deleted_at')
                                        ->first();

        return $pricingPlan ? $pricingPlan->toArray() : [];
    }


     // Método para cadastrar um novo plano de preços
    public function createPricingPlan($request): array  {
        return DB::transaction(function () use ($request) {

            $pricingPlan = $this->modelPricingPlan::create([
                'v_name'              => $request->input('v_name'),
                'f_operator_price'    => $request->input('f_operator_price'),
                'f_preposto_price'    => $request->input('f_preposto_price'),
                'b_is_active'         => $request->input('b_is_active'),
            ]);

            return $pricingPlan->toArray();

        });
    }

    
    // Método para atualizar um plano de preços
    public function updatePricingPlan($request, $pricingPlanId): array {
        return DB::transaction(function () use ($request, $pricingPlanId) {

            $pricingPlan = $this->modelPricingPlan->findOrFail($pricingPlanId);

            $pricingPlan->update([
                'v_name'              => $request->input('v_name'),
                'f_operator_price'    => $request->input('f_operator_price'),
                'f_preposto_price'    => $request->input('f_preposto_price'),
                'b_is_active'         => $request->input('b_is_active'),
            ]);

            return $pricingPlan->refresh()->toArray();

        });
    }


    // Método para deletar um plano de preços
    public function deletePricingPlan($idPricingPlan): array {
        $pricingPlan = $this->modelPricingPlan::where('i_id', $idPricingPlan)
                                        ->whereNull('deleted_at')
                                        ->first();

        if ($pricingPlan) {

            $pricingPlan->b_is_active = false;
            $pricingPlan->delete();

            return $pricingPlan->toArray();
            
        }

        return [];
    }
}