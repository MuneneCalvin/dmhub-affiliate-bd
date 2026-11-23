<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One place a publisher promotes: its type (website, Instagram…) and a URL or account name. */
class PublisherChannel extends Model
{
    protected $fillable = ['publisher_id', 'type', 'handle'];

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(Publisher::class);
    }

    /** Whether the handle is a web address that can be opened as a link. */
    public function isUrl(): bool
    {
        return (bool) preg_match('#^https?://#i', $this->handle);
    }
}
