<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class ConversionMoney
{
    /** Signed ledger projections only; monetary inputs still use cents(). */
    public static function signedCents(mixed $value): int
    {
        if (is_string($value) && str_starts_with($value, '-')) {
            return -self::cents(substr($value, 1));
        }

        return self::cents($value);
    }

    public static function cents(mixed $value): int
    {
        if (! is_scalar($value) || ! preg_match('/^\d{1,9}(?:\.\d{1,2})?$/D', (string) $value)) {
            throw ValidationException::withMessages(['amount' => 'Use a nonnegative decimal with at most nine whole digits and two decimal places.']);
        }
        [$whole, $fraction] = array_pad(explode('.', (string) $value), 2, '');

        return ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');
    }

    /** Exact rounded a * part / whole, without overflowing the integer product. */
    public static function proportion(int $a, int $part, int $whole): int
    {
        if ($a < 0 || $part < 0 || $whole <= 0 || $part > $whole) {
            throw new \InvalidArgumentException('Invalid monetary proportion.');
        }
        $quotient = 0;
        $remainder = 0;
        $termQ = intdiv($a, $whole);
        $termR = $a % $whole;
        while ($part > 0) {
            if ($part % 2 === 1) {
                $quotient += $termQ;
                $remainder += $termR;
                $quotient += intdiv($remainder, $whole);
                $remainder %= $whole;
            }
            $part = intdiv($part, 2);
            if ($part > 0) {
                $termQ = $termQ * 2 + intdiv($termR * 2, $whole);
                $termR = ($termR * 2) % $whole;
            }
        }

        return $quotient + ($remainder >= intdiv($whole, 2) + $whole % 2 ? 1 : 0);
    }

    public static function decimal(int $cents): string
    {
        return ($cents < 0 ? '-' : '').intdiv(abs($cents), 100).'.'.str_pad((string) (abs($cents) % 100), 2, '0', STR_PAD_LEFT);
    }
}
