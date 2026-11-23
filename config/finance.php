<?php

return [
    // Explicit two-decimal settlement currencies. No automatic currency conversion.
    'currencies' => ['USD', 'EUR', 'GBP', 'KES', 'CAD', 'AUD', 'CHF'],

    // What new advertisers, networks and invoices start with; anyone can choose another currency.
    'default_currency' => 'EUR',
];
