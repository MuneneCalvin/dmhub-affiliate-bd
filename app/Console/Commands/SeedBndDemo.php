<?php

namespace App\Console\Commands;

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CommissionType;
use App\Models\LeadContact;
use App\Models\Network;
use App\Models\Offer;
use App\Models\OfferCommission;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\User;
use App\Services\Finance\FundingService;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * Brand New Day demo and test data: an advertiser with the five products the client named, three publishers
 * (one individual, two companies) with approved tracking links, and funding. Safe to run again.
 *
 * The accounts get a random password nobody knows; the owner sets real ones (see docs/demo-data.md).
 */
class SeedBndDemo extends Command
{
    use ConfirmableTrait;

    protected $signature = 'demo:bnd
        {--base-url= : Public address of this app, used for tracking links and the demo form (default APP_URL)}
        {--network= : Network id (default: the active network named Brand New Day, else the first active one)}
        {--progress-leads : Move existing demo leads along their status, so the Leads page has variety}
        {--json : Print the tracking links as JSON}
        {--force : Run in production without asking}';

    protected $description = 'Create Brand New Day demo accounts, products, publishers and tracking links (idempotent)';

    private const EMAIL_DOMAIN = 'demo.dmhub.cloud';

    /** campaign name => [offer name, description, compensation per lead in euro] */
    private const PRODUCTS = [
        'Pensioen spaarrekening' => ['Spaarrekening aanmelding (demo)', 'Een pensioenrekening met zekerheid, voor wie wil sparen voor later.', '25.00'],
        'Pensioen beleggingsrekening' => ['Beleggingsrekening aanmelding (demo)', 'Een pensioenrekening waarmee u belegt voor een hoger pensioen.', '40.00'],
        'Lijfrente uitkeringsrekening' => ['Lijfrente aanvraag (demo)', 'Een uitkering voor wie zijn opgebouwde pensioen wil laten uitbetalen.', '30.00'],
        'Werkgever lead' => ['Werkgever contactverzoek (demo)', 'Werkgevers die een pensioenregeling voor hun personeel zoeken.', '15.00'],
        'Financieel adviseur lead' => ['Adviseur contactverzoek (demo)', 'Financieel adviseurs die met Brand New Day willen samenwerken.', '20.00'],
    ];

    /** Which publisher promotes which campaigns. */
    private const PROMOTES = [
        'creator@'.self::EMAIL_DOMAIN => ['Pensioen spaarrekening', 'Pensioen beleggingsrekening'],
        'vergelijker@'.self::EMAIL_DOMAIN => ['Pensioen spaarrekening', 'Pensioen beleggingsrekening', 'Lijfrente uitkeringsrekening', 'Werkgever lead', 'Financieel adviseur lead'],
        'cashback@'.self::EMAIL_DOMAIN => ['Pensioen spaarrekening', 'Lijfrente uitkeringsrekening', 'Financieel adviseur lead'],
    ];

    public function handle(FundingService $funding): int
    {
        if (! $this->confirmToProceed()) {
            return self::FAILURE;
        }
        $base = rtrim((string) ($this->option('base-url') ?: config('app.url')), '/');
        $network = $this->network();
        if (! $network) {
            $this->error('No active network found.');

            return self::FAILURE;
        }

        $result = DB::transaction(function () use ($base, $network, $funding) {
            $advertiser = $this->advertiser($network);
            $this->fund($funding, $advertiser);
            $publishers = $this->publishers($network);
            $links = [];
            foreach (self::PRODUCTS as $name => [$offerName, $description, $rate]) {
                $offer = $this->product($network, $advertiser, $name, $offerName, $description, $rate, $base);
                foreach (self::PROMOTES as $email => $campaigns) {
                    if (in_array($name, $campaigns, true)) {
                        $links[] = $this->assign($network, $publishers[$email], $offer, $rate, $base);
                    }
                }
            }

            return $links;
        });

        if ($this->option('progress-leads')) {
            $this->progressLeads();
        }
        $this->option('json') ? $this->line(json_encode($result, JSON_UNESCAPED_SLASHES)) : $this->info(count($result).' tracking links ready. Add --json to print them.');

        return self::SUCCESS;
    }

    private function network(): ?Network
    {
        if ($id = $this->option('network')) {
            return Network::find($id);
        }

        return Network::where('status', 'A')->where('network_name', 'like', '%Brand New Day%')->first()
            ?? Network::where('status', 'A')->orderBy('id')->first();
    }

    private function user(string $email, string $first, string $last, string $role): User
    {
        $user = User::firstOrCreate(['email' => $email], [
            'first_name' => $first, 'last_name' => $last, 'title' => $role, 'user_name' => Str::slug("{$first} {$last}").'-'.Str::lower(Str::random(4)),
            // Nobody knows this; the owner chooses real passwords for the accounts they hand out.
            'password' => Hash::make(Str::random(64)),
            'status' => 'A', 'email_verified_at' => now(), 'locale' => 'nl', 'timezone' => 'Europe/Amsterdam', 'language' => 'nl',
            'currency' => 'EUR', 'country_iso' => 'NLD',
        ]);
        $user->assignRoleById(Role::findByName($role)->id);

        return $user;
    }

    private function advertiser(Network $network): Advertiser
    {
        $user = $this->user('bnd.adviseur@'.self::EMAIL_DOMAIN, 'Demo', 'Adverteerder', 'advertiser');

        return Advertiser::firstOrCreate(['user_id' => $user->id], [
            'network_id' => $network->id, 'business_name' => 'Brand New Day Pensioen (demo)', 'website_name' => 'https://www.brandnewday.example.test',
            'industry' => 'Pensioen', 'currency' => 'EUR', 'status' => 'A', 'is_verified' => true, 'verified_at' => now(), 'coc_number' => 'DEMO0000',
        ]);
    }

    private function fund(FundingService $funding, Advertiser $advertiser): void
    {
        if ((float) $advertiser->fresh()->available_budget < 1000) {
            $funding->deposit($advertiser, '10000.00', 'EUR', 'demo-bnd-funding-1', 'Demo funding (test data, not real money)', $advertiser->user_id);
        }
    }

    /** @return array<string, Publisher> publishers by email */
    private function publishers(Network $network): array
    {
        $definitions = [
            'creator@'.self::EMAIL_DOMAIN => ['Demo', 'Creator', 'individual', null, null, [['instagram', '@demo.creator'], ['tiktok', 'https://www.tiktok.com/@demo.creator']]],
            'vergelijker@'.self::EMAIL_DOMAIN => ['Demo', 'Vergelijker', 'company', ['Demo Vergelijker BV', 'DEMO0001'], 'https://vergelijker.example.test',
                [['website', 'https://vergelijker.example.test'], ['newsletter', 'Pensioen Weekly (demo)']]],
            'cashback@'.self::EMAIL_DOMAIN => ['Demo', 'Cashback', 'company', ['Demo Cashback BV', 'DEMO0002'], 'https://cashback.example.test',
                [['website', 'https://cashback.example.test'], ['cashback_loyalty', 'Demo Cashback Club']]],
        ];
        $publishers = [];
        foreach ($definitions as $email => [$first, $last, $type, $company, $website, $channels]) {
            $user = $this->user($email, $first, $last, 'publisher');
            $publisher = Publisher::firstOrCreate(['user_id' => $user->id], [
                'network_id' => $network->id, 'publisher_type' => $type, 'business_name' => $company[0] ?? null, 'coc_number' => $company[1] ?? null,
                'industry' => $company ? 'Media' : null, 'website_url' => $website, 'is_verified' => true, 'verified_at' => now(),
            ]);
            foreach ($channels as [$channel, $handle]) {
                $publisher->channels()->firstOrCreate(['type' => $channel], ['handle' => $handle]);
            }
            $publishers[$email] = $publisher;
        }

        return $publishers;
    }

    private function product(Network $network, Advertiser $advertiser, string $name, string $offerName, string $description, string $rate, string $base): Offer
    {
        $campaign = Campaign::firstOrCreate(['network_id' => $network->id, 'advertiser_id' => $advertiser->id, 'name' => $name], [
            'description' => $description, 'start_date' => now()->subDay(), 'end_date' => now()->addYear(),
            'campaign_status' => 'A', 'currency' => 'EUR', 'total_budget' => 5000,
        ]);
        $offer = Offer::firstOrCreate(['campaign_id' => $campaign->id, 'network_id' => $network->id, 'name' => $offerName], [
            'description' => $description, 'offer_status' => 'A', 'preview_url' => $base, 'conversion_window_hours' => 168, 'click_cookie_lifetime_hours' => 168,
        ]);
        // The tracking link sends visitors to the demo form, which embeds this offer's own script.
        $offer->update(['preview_url' => $base.'/demo/aanmelden.html?k='.$offer->lead_form_key]);
        OfferCommission::firstOrCreate(['offer_id' => $offer->id], [
            'commission_type_id' => CommissionType::where('name', 'CPL')->firstOrFail()->id, 'commission_value' => $rate,
        ]);

        return $offer;
    }

    private function assign(Network $network, Publisher $publisher, Offer $offer, string $rate, string $base): array
    {
        $assignment = PublisherCampaigns::firstOrCreate([
            'publisher_id' => $publisher->id, 'campaign_id' => $offer->campaign_id, 'offer_id' => $offer->id,
        ], [
            'network_id' => $network->id, 'status' => 'A', 'commission_type' => 'CPL', 'commission_value' => $rate,
            'tracking_link' => $base.'/t/'.Str::random(20),
        ]);

        return [
            'publisher' => $publisher->user->email, 'campaign' => $offer->campaign->name, 'offer' => $offer->name,
            'tracking_link' => $assignment->tracking_link, 'form_url' => $offer->fresh()->preview_url,
        ];
    }

    /** A believable spread: new, contacted, qualified, account opened and lost, without touching any money. */
    private function progressLeads(): void
    {
        $cycle = ['new', 'contacted', 'qualified', 'converted', 'lost'];
        LeadContact::where('status', 'new')->orderBy('id')->get()->each(function (LeadContact $lead, int $index) use ($cycle) {
            $status = $cycle[$index % count($cycle)];
            if ($status !== 'new') {
                $lead->update(['status' => $status]);
            }
        });
    }
}
