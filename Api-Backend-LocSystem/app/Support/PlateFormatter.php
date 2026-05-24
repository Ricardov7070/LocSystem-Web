<?php

namespace App\Support;

final class PlateFormatter
{
    private const MERCOSUL_LETTER_MAP = [
        '0' => 'A',
        '1' => 'B',
        '2' => 'C',
        '3' => 'D',
        '4' => 'E',
        '5' => 'F',
        '6' => 'G',
        '7' => 'H',
        '8' => 'I',
        '9' => 'J',
    ];

    public static function normalize(?string $plate): string
    {
        return strtoupper((string) preg_replace('/[^A-Z0-9]/i', '', $plate ?? ''));
    }

    public static function resolveStoragePair(?string $plate): ?array
    {
        $normalized = self::normalize($plate);

        if ($normalized === '') {
            return null;
        }

        if (preg_match('/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/', $normalized)) {
            return [
                'v_plate' => $normalized,
                'v_plate_mercosul' => $normalized,
            ];
        }

        if (!preg_match('/^[A-Z]{3}[0-9]{4}$/', $normalized)) {
            return null;
        }

        return [
            'v_plate' => substr($normalized, 0, 3) . '-' . substr($normalized, 3, 4),
            'v_plate_mercosul' => substr($normalized, 0, 3)
                . $normalized[3]
                . self::MERCOSUL_LETTER_MAP[$normalized[4]]
                . substr($normalized, 5, 2),
        ];
    }
}