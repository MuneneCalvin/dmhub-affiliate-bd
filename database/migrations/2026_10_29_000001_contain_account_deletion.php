<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const RETAINED_TABLES = [
        'publishers', 'advertisers', 'campaigns', 'offers', 'creatives',
        'publisher_campaigns', 'clicks', 'conversions', 'leads',
        'publisher_invoices', 'publisher_earnings', 'network_invoices',
        'network_earnings', 'disputes', 'dispute_messages',
    ];

    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->timestamp('closed_at')->nullable());

        // Guard every path into retained history, including deletes issued outside Eloquent.
        foreach (self::RETAINED_TABLES as $tableName) {
            $keys = Schema::getForeignKeys($tableName);
            Schema::table($tableName, function (Blueprint $table) use ($keys) {
                foreach ($keys as $key) {
                    if (in_array(strtolower($key['on_delete']), ['cascade', 'set null'])) {
                        $table->dropForeign(Schema::getConnection()->getDriverName() === 'sqlite' ? $key['columns'] : $key['name']);
                        $table->foreign($key['columns'], $key['name'])
                            ->references($key['foreign_columns'])
                            ->on($key['foreign_table'])
                            ->onUpdate($key['on_update'])
                            ->restrictOnDelete();
                    }
                }
            });
        }
    }

    public function down(): void
    {
        // Do not restore destructive cascades on rollback.
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('closed_at'));
    }
};
