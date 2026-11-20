<?php

namespace App\Console\Commands;

use App\Services\Finance\ReconciliationService;
use Illuminate\Console\Command;

class ReconcileFinance extends Command
{
    protected $signature = 'finance:reconcile';

    protected $description = 'Read-only reconciliation of ledger evidence, advertiser balances and settlement liabilities';

    public function handle(ReconciliationService $reconciliation): int
    {
        $issues = $reconciliation->inspect();
        foreach ($issues as $issue) {
            $this->error($issue);
        }
        if ($issues) {
            return self::FAILURE;
        }
        $this->info('Financial ledger and settlement liabilities reconcile.');

        return self::SUCCESS;
    }
}
