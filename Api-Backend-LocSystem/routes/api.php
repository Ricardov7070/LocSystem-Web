<?php

use App\Http\Controllers\User\UserAuthenticationController;
use App\Http\Controllers\User\UserRegistrationController;
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
    Route::put('/updateUser', [UserRegistrationController::class, 'updateRecord']);
    Route::post('/logoutUser', [UserAuthenticationController::class, 'logoutUser']);
    Route::delete('/deleteUser', [UserRegistrationController::class, 'deleteRecord']);

});
