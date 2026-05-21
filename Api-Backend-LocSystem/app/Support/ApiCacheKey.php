<?php

namespace App\Support;

class ApiCacheKey
{
    public static function forUser(string $prefix, array $payload = [], ?int $userId = null): string
    {
        $resolvedUserId = $userId ?? auth()->id() ?? 0;

        return $prefix . ':user:' . $resolvedUserId . ':' . md5(json_encode($payload));
    }
}