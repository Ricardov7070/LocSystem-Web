<?php

use App\Http\Controllers\User\UserAuthenticationController;
use App\Http\Controllers\User\UserRegistrationController;
use App\Http\Controllers\Vehicle\VehicleController;
use Illuminate\Support\Facades\Route;


// Rotas que não nescessitam de autenticação
Route::post('/auth/signin', [UserAuthenticationController::class, 'userAuthentication']);
Route::post('/auth/signup', [UserRegistrationController::class, 'registerUsers']);
Route::post('/auth/forgotPassword', [UserAuthenticationController::class, 'forgotPassword']);
Route::put('/auth/updatePassword', [UserAuthenticationController::class, 'updatePassword']);
Route::post('/auth/checkAuthenticationPerformed', [UserAuthenticationController::class, 'checkAuthenticationPerformed']);


// Rotas que nescessitam de autenticação
Route::middleware('auth:sanctum')->group(function () {
    
    // Rotas "Usuários"
    Route::put('/updateUser/{id}', [UserRegistrationController::class, 'updateRecord']);
    Route::get('/logoutUser', [UserAuthenticationController::class, 'logoutUser']);
    Route::delete('/deleteUser/{id}', [UserRegistrationController::class, 'deleteRecord']);

    // Rotas "Veículos"
    Route::post('/vehicles', [VehicleController::class, 'vehicles']);
    Route::get('/singleVehicle/{id}', [VehicleController::class, 'singleVehicle']);
    Route::post('/registerVehicle', [VehicleController::class, 'registerVehicle']);
    Route::put('/updateVehicle/{id}', [VehicleController::class, 'updateRecord']);
    Route::delete('/deleteVehicle/{id}', [VehicleController::class, 'deleteRecord']);

});
