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
        Schema::create('leads', function (Blueprint $table) {
            $table->id();

            // Foreign keys - link to tracking data
            $table->foreignId('click_id')->nullable()->constrained('clicks')->onDelete('set null');
            $table->foreignId('publisher_id')->nullable()->constrained('publishers')->onDelete('set null');
            $table->foreignId('network_id')->nullable()->constrained('networks')->onDelete('set null');
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->onDelete('set null');
            $table->foreignId('offer_id')->nullable()->constrained('offers')->onDelete('set null');
            $table->foreignId('publisher_campaign_id')->nullable()->constrained('publisher_campaigns')->onDelete('set null');
            $table->foreignId('creative_id')->nullable()->constrained('creatives')->onDelete('set null');

            // Basic contact information
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('phone', 50)->nullable();

            // Extended information
            $table->string('company', 255)->nullable();
            $table->string('job_title', 100)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('country', 100)->nullable();

            // CRM fields
            $table->enum('status', ['new', 'contacted', 'qualified', 'converted', 'lost', 'unresponsive'])->default('new');
            $table->string('source', 100)->nullable(); // e.g., 'form', 'postback', 'api'
            $table->string('utm_source', 100)->nullable();
            $table->string('utm_medium', 100)->nullable();
            $table->string('utm_campaign', 100)->nullable();
            $table->string('utm_term', 100)->nullable();
            $table->string('utm_content', 100)->nullable();
            $table->text('notes')->nullable();
            $table->json('custom_fields')->nullable(); // For additional custom data

            // Tracking data
            $table->string('ip_address', 100)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('referer', 500)->nullable();
            $table->string('device_type', 50)->nullable();
            $table->string('browser', 100)->nullable();
            $table->string('operating_system', 100)->nullable();
            $table->string('country_iso', 3)->nullable();
            $table->string('region', 200)->nullable();
            $table->string('city_town', 100)->nullable();

            // Lead value/scoring
            $table->decimal('lead_value', 15, 2)->nullable();
            $table->integer('lead_score')->default(0);
            $table->string('priority', 20)->default('medium'); 

            // Assignment and follow-up
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('last_contacted_at')->nullable();
            $table->timestamp('next_follow_up_at')->nullable();
            $table->integer('contact_attempts')->default(0);

            // Conversion tracking
            $table->boolean('is_converted')->default(false);
            $table->timestamp('converted_at')->nullable();
            $table->decimal('conversion_value', 15, 2)->nullable();

            // Unique tracking token for postback
            $table->string('lead_token', 64)->unique()->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('click_id', 'idx_leads_click');
            $table->index('publisher_id', 'idx_leads_publisher');
            $table->index('campaign_id', 'idx_leads_campaign');
            $table->index('status', 'idx_leads_status');
            $table->index('email', 'idx_leads_email');
            $table->index('created_at', 'idx_leads_created');
            $table->index(['status', 'created_at'], 'idx_leads_status_created');
            $table->index('assigned_to', 'idx_leads_assigned');
            $table->index('lead_token', 'idx_leads_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
