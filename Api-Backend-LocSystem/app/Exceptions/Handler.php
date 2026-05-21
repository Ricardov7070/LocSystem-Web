<?php

namespace App\Exceptions;

use App\Support\ApiErrorStatus;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class Handler extends ExceptionHandler
{
    protected function unauthenticated($request, AuthenticationException $exception) {
        return response()->json([
            'info' => 'Autenticação Necessária'
        ], 401);
    }
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });

        $this->renderable(function (HttpException $exception, $request) {
            if (!$request->expectsJson() && !$request->is('api/*')) {
                return null;
            }

            return response()->json([
                'info' => $exception->getMessage(),
            ], ApiErrorStatus::normalize($exception->getStatusCode()));
        });
    }
}
