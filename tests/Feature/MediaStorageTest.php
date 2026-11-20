<?php

use App\Models\Creative;
use App\Support\MediaStorage;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

it('keeps uploads on the public disk unless a media disk is configured', function () {
    expect(MediaStorage::disk())->toBe('public');
});

it('stores creative uploads on the configured media disk and saves the public URL', function () {
    config(['filesystems.media_disk' => 'r2', 'filesystems.disks.r2.url' => 'https://media.example.test']);
    Storage::fake('r2', ['url' => 'https://media.example.test']);
    Storage::fake('public');
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);

    $this->actingAs($user)->post(route('advertiser.creatives.store'), [
        'campaign_id' => $f['campaign']->id, 'offer_id' => $f['offer']->id,
        'name' => 'R2 creative', 'type' => 'banner',
        'asset' => UploadedFile::fake()->image('banner.png', 728, 90),
    ])->assertSessionHasNoErrors()->assertSessionHas('success');

    $creative = Creative::where('name', 'R2 creative')->firstOrFail();
    expect($creative->file_url)->toStartWith('https://media.example.test/creatives/')
        ->and(Storage::disk('r2')->allFiles('creatives'))->toHaveCount(1)
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});

it('deletes a stored file by URL from whichever disk holds it', function () {
    config(['filesystems.disks.r2.url' => 'https://media.example.test']);
    Storage::fake('r2');
    Storage::fake('public');
    Storage::disk('r2')->put('network_logos/new.png', 'x');
    Storage::disk('public')->put('network_logos/legacy.png', 'x');
    Storage::disk('public')->put('network_logos/other.png', 'x');

    MediaStorage::deleteUrl('https://media.example.test/network_logos/new.png');
    MediaStorage::deleteUrl('/storage/network_logos/legacy.png');
    MediaStorage::deleteUrl('https://elsewhere.example/network_logos/other.png');
    MediaStorage::deleteUrl(null);

    expect(Storage::disk('r2')->allFiles())->toBe([])
        ->and(Storage::disk('public')->allFiles())->toBe(['network_logos/other.png']);
});

it('strips the disk root folder from a stored URL before deleting', function () {
    config(['filesystems.disks.r2.url' => 'https://media.example.test', 'filesystems.disks.r2.root' => 'nl']);
    Storage::fake('r2');
    Storage::disk('r2')->put('network_logos/new.png', 'x');

    MediaStorage::deleteUrl('https://media.example.test/nl/network_logos/new.png');

    expect(Storage::disk('r2')->allFiles())->toBe([]);
});
