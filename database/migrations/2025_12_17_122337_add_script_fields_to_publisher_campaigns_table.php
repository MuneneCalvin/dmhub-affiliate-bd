<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('publisher_campaigns', function (Blueprint $table) {
            $table->string('script_token', 32)->unique()->nullable()->after('tracking_link');
            $table->json('form_settings')->nullable()->after('script_token');
            $table->string('form_title', 255)->nullable()->after('form_settings');
            $table->string('form_button_text', 100)->nullable()->after('form_title');
            $table->string('form_success_message', 255)->nullable()->after('form_button_text');
            $table->string('form_redirect_url', 500)->nullable()->after('form_success_message');
            $table->enum('form_trigger', ['auto', 'click', 'delay', 'exit_intent', 'scroll'])->default('auto')->after('form_redirect_url');
            $table->integer('form_delay_seconds')->default(0)->after('form_trigger');
            $table->integer('form_scroll_percent')->default(50)->after('form_delay_seconds');
            $table->bigInteger('script_impressions')->default(0)->after('form_scroll_percent');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('publisher_campaigns', function (Blueprint $table) {
            $table->dropColumn([
                'script_token',
                'form_settings',
                'form_title',
                'form_button_text',
                'form_success_message',
                'form_redirect_url',
                'form_trigger',
                'form_delay_seconds',
                'form_scroll_percent',
                'script_impressions',
            ]);
        });
    }
};
