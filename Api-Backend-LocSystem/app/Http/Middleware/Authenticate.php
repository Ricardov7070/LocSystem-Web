<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // Se a requisição espera JSON (comum em APIs), ou se você quer 
        // forçar o erro para evitar o redirecionamento:
        if (! $request->expectsJson()) {
            // Lançamos a exceção manualmente para que o Handler a capture
            throw new AuthenticationException('Autenticação Necessária');
        }

        return null; 
    }
}
