<?php

use App\Http\Controllers\User\UserAuthenticationController;
use App\Http\Controllers\User\UserRegistrationController;
use App\Http\Controllers\User\TwoFactorController;
use App\Http\Controllers\User\AdvisoryUserController;
use App\Http\Controllers\Vehicle\VehicleController;
use App\Http\Controllers\Wallet\WalletController;
use App\Http\Controllers\PricingPlan\PricingPlanController;
use App\Http\Controllers\Banned\BannedController;
use App\Http\Controllers\Session\SessionController;
use App\Http\Controllers\Logs\LogsController;
use App\Http\Controllers\CameraMonitoring\CameraMonitoringController;
use App\Http\Controllers\LegalAdvisory\LegalAdvisoryController;
use App\Http\Controllers\VehicleAnnouncement\VehicleAnnouncementController;
use App\Http\Controllers\VehicleImport\VehicleImportController;
use Illuminate\Support\Facades\Route;


// Rotas que não nescessitam de autenticação
Route::post('/auth/signin', [UserAuthenticationController::class, 'userAuthentication']);
Route::post('/auth/signup', [UserRegistrationController::class, 'registerUsers']);
Route::post('/auth/forgotPassword', [UserAuthenticationController::class, 'forgotPassword']);
Route::put('/auth/updatePassword', [UserAuthenticationController::class, 'updatePassword']);
Route::post('/auth/checkAuthenticationPerformed', [UserAuthenticationController::class, 'checkAuthenticationPerformed']);
Route::post('/auth/2fa/verify-login', [TwoFactorController::class, 'verifyLogin']);

// Rotas "Logs"
Route::get('/logs', [LogsController::class, 'logs']);

// Rotas que nescessitam de autenticação
Route::middleware('auth:sanctum')->group(function () {
    
    // Rotas "Usuários"
    Route::put('/updateUser/{id}', [UserRegistrationController::class, 'updateRecord']);
    Route::post('/uploadProfileImage', [UserRegistrationController::class, 'uploadProfileImageRecord']);
    Route::get('/logoutUser', [UserAuthenticationController::class, 'logoutUser']);
    Route::delete('/deleteUser/{id}', [UserRegistrationController::class, 'deleteRecord']);
    Route::post('/verify-password', [UserAuthenticationController::class, 'verifyPassword']);
    Route::put('/change-password', [UserAuthenticationController::class, 'changePassword']);

    // Rotas "Usuários de Assessoria"
    Route::get('/advisory-users', [AdvisoryUserController::class, 'list']);
    Route::get('/advisory-users/my-tenants', [AdvisoryUserController::class, 'myTenants']);
    Route::get('/advisory-users/{id}', [AdvisoryUserController::class, 'findOne']);
    Route::post('/advisory-users', [AdvisoryUserController::class, 'create']);
    Route::put('/advisory-users/{id}', [AdvisoryUserController::class, 'update']);
    Route::patch('/advisory-users/{id}/status', [AdvisoryUserController::class, 'toggleStatus']);
    Route::patch('/advisory-users/{id}/password', [AdvisoryUserController::class, 'changePassword']);
    Route::post('/advisory-users/{id}/reset-2fa', [AdvisoryUserController::class, 'resetTwoFactor']);
    Route::delete('/advisory-users/{id}', [AdvisoryUserController::class, 'delete']);

    // Rotas "2FA"
    Route::get('/auth/2fa/status', [TwoFactorController::class, 'status']);
    Route::post('/auth/2fa/enable', [TwoFactorController::class, 'enable']);
    Route::post('/auth/2fa/verify-activate', [TwoFactorController::class, 'verifyAndActivate']);
    Route::post('/auth/2fa/disable', [TwoFactorController::class, 'disable']);

    // Rotas "Veículos"
    Route::post('/vehicles', [VehicleController::class, 'vehicles']);
    Route::get('/singleVehicle/{id}', [VehicleController::class, 'singleVehicle']);
    Route::post('/registerVehicle', [VehicleController::class, 'registerVehicle']);
    Route::put('/updateVehicle/{id}', [VehicleController::class, 'updateRecord']);
    Route::delete('/deleteVehicle/{id}', [VehicleController::class, 'deleteRecord']);

    // Rotas "Veículos com Comunicados"
    Route::post('/vehicle-announcements', [VehicleAnnouncementController::class, 'list']);
    Route::put('/vehicle-announcements/{id}/type', [VehicleAnnouncementController::class, 'updateType']);
    Route::delete('/vehicle-announcements/{id}', [VehicleAnnouncementController::class, 'delete']);

    // Rotas "Assessorias Jurídicas"
    Route::post('/legalAdvisories', [LegalAdvisoryController::class, 'legalAdvisories']);
    Route::get('/legalAdvisories/options', [LegalAdvisoryController::class, 'options']);
    Route::get('/singleLegalAdvisory/{id}', [LegalAdvisoryController::class, 'singleLegalAdvisory']);
    Route::post('/registerLegalAdvisory', [LegalAdvisoryController::class, 'registerLegalAdvisory']);
    Route::put('/updateLegalAdvisory/{id}', [LegalAdvisoryController::class, 'updateRecord']);
    Route::delete('/deleteLegalAdvisory/{id}', [LegalAdvisoryController::class, 'deleteRecord']);

    // Rotas "Importação de Veículos por Assessoria"
    Route::get('/legalAdvisories/{id}/vehicle-imports', [VehicleImportController::class, 'findByLegalAdvisory']);
    Route::post('/vehicle-imports/preview', [VehicleImportController::class, 'previewFile']);
    Route::post('/vehicle-imports/validate', [VehicleImportController::class, 'validateImport']);
    Route::post('/vehicle-imports/execute', [VehicleImportController::class, 'executeImport']);
    Route::delete('/vehicle-imports/{id}', [VehicleImportController::class, 'deleteRecord']);

    // Rotas "Carteiras"
    Route::get('/wallets', [WalletController::class, 'wallets']);
    Route::get('/singleWallet/{id}', [WalletController::class, 'singleWallet']);
    Route::post('/registerWallet', [WalletController::class, 'registerWallet']);
    Route::put('/updateWallet/{id}', [WalletController::class, 'updateRecord']);
    Route::delete('/deleteWallet/{id}', [WalletController::class, 'deleteRecord']);

    // Rotas "Planos de Preços"
    Route::get('/pricingPlans', [PricingPlanController::class, 'pricingPlans']);
    Route::get('/singlePricingPlan/{id}', [PricingPlanController::class, 'singlePricingPlan']);
    Route::post('/registerPricingPlan', [PricingPlanController::class, 'registerPricingPlan']);
    Route::put('/updatePricingPlan/{id}', [PricingPlanController::class, 'updateRecord']);
    Route::delete('/deletePricingPlan/{id}', [PricingPlanController::class, 'deleteRecord']);
    Route::put('/activateDeactivatePricingPlans/{id}', [PricingPlanController::class, 'activateDeactivatePricingPlans']);

    // Rotas "Usuários Banidos"
    Route::get('/banneds', [BannedController::class, 'banneds']);
    Route::get('/singleBanned/{id}', [BannedController::class, 'singleBanned']);

    // Rotas "Sessões"
    Route::get('/sessions', [SessionController::class, 'sessions']);
    Route::post('/singleSession/{id}', [SessionController::class, 'singleSession']);

    // Rotas "Monitoramento de Câmera"
    Route::get('/camera-monitoring/config', [CameraMonitoringController::class, 'getConfig']);
    Route::post('/camera-monitoring/config', [CameraMonitoringController::class, 'saveConfig']);
    Route::get('/camera-monitoring/search/{plate}', [CameraMonitoringController::class, 'searchByPlate']);
    Route::post('/camera-monitoring/incidence', [CameraMonitoringController::class, 'saveIncidence']);
    Route::get('/camera-monitoring/history', [CameraMonitoringController::class, 'getHistory']);
});
