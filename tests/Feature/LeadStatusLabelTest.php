<?php

use App\Exports\LeadContactsExport;
use App\Models\LeadContact;

it('writes "converted" as an opened account in the export, in the reader\'s language', function (string $locale, string $expected) {
    $f = conversionFixture();
    $lead = new LeadContact(['email' => 'anna@example.nl', 'status' => 'converted']);
    app()->setLocale($locale);

    $row = (new LeadContactsExport($f['advertiser']->user))->map($lead);

    expect($row[8])->toBe($expected);
})->with([['en', 'Account opened'], ['nl', 'Account geopend']]);

it('translates the other lead statuses in the export too', function (string $status, string $expected) {
    $f = conversionFixture();
    app()->setLocale('nl');

    $row = (new LeadContactsExport($f['advertiser']->user))->map(new LeadContact(['email' => 'a@b.nl', 'status' => $status]));

    expect($row[8])->toBe($expected);
})->with([['new', 'Nieuw'], ['contacted', 'Gecontacteerd'], ['qualified', 'Gekwalificeerd'], ['lost', 'Verloren']]);
