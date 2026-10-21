<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 30);
            $table->string('last_name', 30);
            $table->string('email')->unique();
            $table->string('user_name', 50)->unique();
            $table->string('title', 50)->nullable()->index();
            $table->string('status', 1)->default('P')->index();
            $table->boolean('is_super_admin')->default(false)->index();
            $table->boolean('is_network')->default(false)->index();
            $table->boolean('is_publisher')->default(false)->index();
            $table->boolean('is_advertiser')->default(false)->index();
            $table->timestamp('email_verified_at')->nullable()->index();
            $table->string('password');
            $table->timestamp('password_expiry_date')->nullable();
            $table->string('timezone', 50)->nullable();
            $table->string('language', 20)->nullable();
            $table->string('currency', 3)->nullable();
            $table->string('country_iso', 3)->nullable()->index();;
            $table->rememberToken();
            
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
