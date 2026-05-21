<?php

namespace App\Support;

class ApiErrorStatus
{
    public static function normalize(int $statusCode): int
    {
        return match ($statusCode) {
            401, 409, 422, 500 => $statusCode,
            400, 404 => 422,
            403 => 401,
            default => 500,
        };
    }
}