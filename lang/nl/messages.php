<?php

return [
    'success' => [
        'created' => ':item is succesvol aangemaakt.',
        'updated' => ':item is succesvol bijgewerkt.',
        'deleted' => ':item is succesvol verwijderd.',
        'saved' => 'Wijzigingen zijn opgeslagen.',
    ],

    'error' => [
        'generic' => 'Er is een fout opgetreden. Probeer het opnieuw.',
        'not_found' => ':item niet gevonden.',
        'unauthorized' => 'Je hebt geen toegang tot deze actie.',
        'forbidden' => 'Deze actie is niet toegestaan.',
        'validation' => 'De ingevulde gegevens zijn ongeldig.',
    ],

    'confirm' => [
        'delete' => 'Weet je zeker dat je :item wilt verwijderen?',
        'logout' => 'Weet je zeker dat je wilt uitloggen?',
    ],

    'applications' => [
        'approved' => '{1} :count aanvraag goedgekeurd.|[2,*] :count aanvragen goedgekeurd.',
        'rejected' => '{1} :count aanvraag afgewezen.|[2,*] :count aanvragen afgewezen.',
        'skipped' => '{1} :count aanvraag kon niet worden beoordeeld; open deze om te zien waarom.|[2,*] :count aanvragen konden niet worden beoordeeld; open ze om te zien waarom.',
    ],

    'campaigns' => [
        'paused' => 'Campagne gepauzeerd.',
        'resumed' => 'Campagne hervat.',
    ],

    'invoices' => [
        'pdf' => [
            'invoice' => 'Factuur',
            'bill_from' => 'Factuur van',
            'bill_to' => 'Factuur aan',
            'issued' => 'Uitgegeven',
            'period' => 'Periode',
            'status' => 'Status',
            'campaign' => 'Campagne',
            'type' => 'Type',
            'date' => 'Datum',
            'compensation' => 'Vergoeding',
            'subtotal' => 'Subtotaal',
            'recovery' => 'Eerdere terugboeking van restitutie afgetrokken',
            'total' => 'Totaal',
            'paid_on' => 'Betaald op :date',
            'reference' => 'Betalingskenmerk',
            'payout_method' => 'Uitbetalingsmethode',
            'page' => 'Pagina :page van :pages',
            'no_lines' => 'Er zijn geen verdiensten aan deze factuur gekoppeld.',
            'statuses' => [
                'pending' => 'In behandeling',
                'approved' => 'Goedgekeurd',
                'paid' => 'Betaald',
                'rejected' => 'Afgewezen',
            ],
        ],
    ],
];
