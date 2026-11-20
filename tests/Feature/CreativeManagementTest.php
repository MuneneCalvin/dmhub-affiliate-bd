<?php

use App\Models\Creative;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Storage::fake('public');
    $this->seed(RolePermsSeeder::class);
    $this->creativeFixture = conversionFixture();
    $user = $this->creativeFixture['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($user);
    $this->creativeData = [
        'campaign_id' => $this->creativeFixture['campaign']->id,
        'offer_id' => $this->creativeFixture['offer']->id,
        'name' => 'Summer creative', 'type' => 'banner',
    ];
});

it('uploads images and generates dimensions, URLs and tracking without trusting supplied generated fields', function (string $type) {
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData,
        'type' => $type,
        'asset' => UploadedFile::fake()->image('banner.png', 728, 90),
        'width' => 1, 'height' => 1, 'file_url' => 'https://wrong.example/asset',
        'preview_url' => 'https://wrong.example/preview', 'tracking_code' => 'forged', 'embed_code' => 'forged',
        'alt_text' => 'Summer "sale" <special>',
    ])->assertSessionHasNoErrors()->assertSessionHas('success');
    $creative = Creative::where('name', 'Summer creative')->firstOrFail();
    expect((int) $creative->width)->toBe(728)->and((int) $creative->height)->toBe(90)
        ->and($creative->file_url)->toContain('/storage/creatives/')
        ->and($creative->preview_url)->toBe($creative->file_url)
        ->and($creative->tracking_code)->not->toBe('forged')
        ->and($creative->embed_code)->toContain($creative->getDirectTrackingUrl(), 'Summer &quot;sale&quot; &lt;special&gt;')
        ->and($creative->tracking_pixel)->toContain($creative->getImpressionPixelUrl());
    expect(Storage::disk('public')->allFiles('creatives'))->toHaveCount(1);
})->with(['banner', 'image', 'email']);

it('creates text and HTML creatives without requiring an asset URL or dimensions', function (string $type, array $content) {
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData, 'type' => $type, ...$content])
        ->assertSessionHasNoErrors()->assertSessionHas('success');
    $creative = Creative::where('name', 'Summer creative')->firstOrFail();
    expect($creative->file_url)->toBe('')->and($creative->width)->toBeNull()
        ->and($creative->embed_code)->toContain($creative->getDirectTrackingUrl());
})->with([
    ['text', ['alt_text' => 'Shop the sale']],
    ['html', ['html_code' => '<a href="{{click_url}}">Shop</a>']],
]);

it('rejects missing content, invalid media, oversized images and foreign offers before storing files', function () {
    $this->post(route('advertiser.creatives.store'), $this->creativeData)->assertSessionHasErrors('asset');
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData, 'type' => 'html'])->assertSessionHasErrors('html_code');
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData, 'type' => 'text'])->assertSessionHasErrors('alt_text');
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData, 'asset' => UploadedFile::fake()->create('bad.php', 10, 'text/plain')])->assertSessionHasErrors('asset');
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData, 'asset' => UploadedFile::fake()->image('big.png')->size(10241)])->assertSessionHasErrors('asset');
    $foreign = conversionFixture();
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData, 'offer_id' => $foreign['offer']->id, 'asset' => UploadedFile::fake()->image('banner.png')])->assertStatus(422);
    expect(Storage::disk('public')->allFiles())->toBe([]);
});

it('retains uploads on edit and requires a new asset when changing media type', function () {
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData, 'asset' => UploadedFile::fake()->image('banner.png', 300, 250)])
        ->assertSessionHas('success');
    $creative = Creative::where('name', 'Summer creative')->firstOrFail();
    $url = $creative->file_url;
    $code = $creative->tracking_code;
    $this->post(route('advertiser.creatives.update', $creative->id), [...$this->creativeData, 'alt_text' => 'Updated'])
        ->assertSessionHasNoErrors()->assertSessionHas('success');
    expect($creative->fresh()->file_url)->toBe($url)->and($creative->fresh()->tracking_code)->toBe($code)
        ->and($creative->fresh()->embed_code)->toContain('Updated');
    $this->post(route('advertiser.creatives.update', $creative->id), [...$this->creativeData, 'type' => 'video'])
        ->assertSessionHasErrors('asset');
    $this->post(route('advertiser.creatives.update', $creative->id), [...$this->creativeData, 'asset' => UploadedFile::fake()->image('new.png', 600, 400)])
        ->assertSessionHas('success');
    expect($creative->fresh()->file_url)->not->toBe($url)->and((int) $creative->fresh()->width)->toBe(600);
});

it('stores video and poster uploads and generates the matching embed MIME type', function () {
    $this->post(route('advertiser.creatives.store'), [...$this->creativeData, 'type' => 'video',
        'asset' => UploadedFile::fake()->create('clip.webm', 100, 'video/webm'),
        'preview_image' => UploadedFile::fake()->image('poster.png'), 'width' => 640, 'height' => 360,
    ])->assertSessionHasNoErrors()->assertSessionHas('success');
    $creative = Creative::where('name', 'Summer creative')->firstOrFail();
    expect($creative->embed_code)->toContain('video/webm', 'poster="', 'width="640"')
        ->and($creative->preview_url)->toContain('/creatives/previews/');
});
