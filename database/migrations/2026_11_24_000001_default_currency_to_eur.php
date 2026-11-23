<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TABLES = ['advertisers', 'network_earnings', 'network_invoices', 'publisher_invoices'];

    /**
     * The platform is euro-first. Only the default for new rows changes; every stored currency stays as it is.
     * Fresh databases get EUR from the create migrations. This brings databases that already ran them in line.
     * SQLite is skipped on purpose: it can only change a default by rebuilding the table, which drops the
     * financial triggers on it, and the code always states a currency when it creates a row.
     */
    public function up(): void
    {
        $this->setDefault('EUR');
    }

    public function down(): void
    {
        $this->setDefault('USD');
    }

    private function setDefault(string $currency): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        foreach (self::TABLES as $table) {
            DB::statement("ALTER TABLE {$table} ALTER COLUMN currency SET DEFAULT '{$currency}'");
        }
    }
};
