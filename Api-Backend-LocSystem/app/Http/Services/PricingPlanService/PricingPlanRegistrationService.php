<?php

namespace App\Http\Services\PricingPlanService;

use App\Models\PricingPlan\PricingPlan;
use App\Support\ApiCacheKey;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Http\Services\LogsService\LogsService;


class PricingPlanRegistrationService {

    protected $modelPricingPlan;
    protected $logsService;

    // Método Construtor
    public function __construct(PricingPlan $modelPricingPlan, LogsService $logsService) {
        $this->modelPricingPlan = $modelPricingPlan;
        $this->logsService = $logsService;
    }


    // Método para visualizar os planos de preços cadastrados
    public function viewPricingPlans(): Collection {
        return Cache::store('redis')->remember(ApiCacheKey::forUser('pricing_plans_list'), 30, function () {
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
        $pricingPlan = DB::transaction(function () use ($request) {

            $pricingPlan = $this->modelPricingPlan::create([
                'v_name'              => $request->input('v_name'),
                'f_operator_price'    => $request->input('f_operator_price'),
                'f_preposto_price'    => $request->input('f_preposto_price'),
                'b_is_active'         => $request->input('b_is_active'),
            ]);

            return $pricingPlan->toArray();

        });

        $this->logsService->createLog(
            auth()->id(),
            'Criação de Plano de Preços',
            $pricingPlan,
            'Plano de preços criado com sucesso'
        );

        return $pricingPlan;
    }

    
    // Método para atualizar um plano de preços
    public function updatePricingPlan($request, $pricingPlanId): array {
        $pricingPlan = DB::transaction(function () use ($request, $pricingPlanId) {

            $pricingPlan = $this->modelPricingPlan->findOrFail($pricingPlanId);

            $pricingPlan->update([
                'v_name'              => $request->input('v_name'),
                'f_operator_price'    => $request->input('f_operator_price'),
                'f_preposto_price'    => $request->input('f_preposto_price'),
                'b_is_active'         => $request->input('b_is_active'),
            ]);

            return $pricingPlan->refresh()->toArray();

        });

        $this->logsService->createLog(
            auth()->id(),
            'Atualização de Plano de Preços',
            $pricingPlan,
            'Plano de preços atualizado com sucesso'
        );

        return $pricingPlan;
    }


    // Método para deletar um plano de preços
    public function deletePricingPlan($idPricingPlan): array {
        $pricingPlan = $this->modelPricingPlan::where('i_id', $idPricingPlan)
                                        ->whereNull('deleted_at')
                                        ->first();

        if ($pricingPlan) {

            $pricingPlan->b_is_active = false;
            $pricingPlanData = $pricingPlan->toArray();
            $pricingPlan->delete();

            $this->logsService->createLog(
                auth()->id(),
                'Exclusão de Plano de Preços',
                $pricingPlanData,
                'Plano de preços deletado com sucesso'
            );

            return $pricingPlanData;
            
        }

        return [];
    }


    // Método para ativar ou desativar um plano de preços
    public function activateDeactivatePricingPlans ($idPricingPlan): array {
        $pricingPlans = $this->modelPricingPlan::where('i_id', $idPricingPlan)
                                                ->whereNull('deleted_at')
                                                ->get();

        foreach ($pricingPlans as $plan) {
            $plan->b_is_active = !$plan->b_is_active;
            $plan->save();
        }

        return $pricingPlans->toArray();
    }
}