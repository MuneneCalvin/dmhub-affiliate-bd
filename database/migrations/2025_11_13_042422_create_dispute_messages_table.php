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
         Schema::create('dispute_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispute_id')->constrained('disputes')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('message');
            $table->jsonb('attachments')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->timestamps();

            // ---- Indexing Section ----
            $table->index('dispute_id', 'idx_dispute_messages_dispute_id');
            $table->index('user_id', 'idx_dispute_messages_user_id');
            $table->index('is_internal', 'idx_dispute_messages_is_internal');
            $table->index('created_at', 'idx_dispute_messages_created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dispute_messages');
    }
};
