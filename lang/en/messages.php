<?php

return [
    'success' => [
        'created' => ':item has been created successfully.',
        'updated' => ':item has been updated successfully.',
        'deleted' => ':item has been deleted successfully.',
        'saved' => 'Changes have been saved.',
    ],

    'error' => [
        'generic' => 'An error occurred. Please try again.',
        'not_found' => ':item not found.',
        'unauthorized' => 'You do not have access to this action.',
        'forbidden' => 'This action is not allowed.',
        'validation' => 'The provided data is invalid.',
    ],

    'confirm' => [
        'delete' => 'Are you sure you want to delete :item?',
        'logout' => 'Are you sure you want to log out?',
    ],

    'applications' => [
        'approved' => '{1} :count application approved.|[2,*] :count applications approved.',
        'rejected' => '{1} :count application rejected.|[2,*] :count applications rejected.',
        'skipped' => '{1} :count application could not be reviewed; open it to see why.|[2,*] :count applications could not be reviewed; open them to see why.',
    ],

    'campaigns' => [
        'paused' => 'Campaign paused.',
        'resumed' => 'Campaign resumed.',
    ],

    'invoices' => [
        'pdf' => [
            'invoice' => 'Invoice',
            'bill_from' => 'Bill from',
            'bill_to' => 'Bill to',
            'issued' => 'Issued',
            'period' => 'Period',
            'status' => 'Status',
            'campaign' => 'Campaign',
            'type' => 'Type',
            'date' => 'Date',
            'commission' => 'Commission',
            'subtotal' => 'Subtotal',
            'recovery' => 'Prior refund recovery deducted',
            'total' => 'Total',
            'paid_on' => 'Paid on :date',
            'reference' => 'Payment reference',
            'payout_method' => 'Payout method',
            'page' => 'Page :page of :pages',
            'no_lines' => 'No earnings attached to this invoice.',
            'statuses' => [
                'pending' => 'Pending',
                'approved' => 'Approved',
                'paid' => 'Paid',
                'rejected' => 'Rejected',
            ],
        ],
    ],
];
