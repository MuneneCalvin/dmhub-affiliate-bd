<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * User-uploaded images live on one configurable disk (filesystems.media_disk): "public" locally, "r2" in production.
 * Rows keep the full URL, so files uploaded before a disk switch keep working and can still be deleted.
 */
class MediaStorage
{
    public static function disk(): string
    {
        return config('filesystems.media_disk', 'public');
    }

    public static function store(UploadedFile $file, string $directory): string|false
    {
        return $file->store($directory, self::disk());
    }

    public static function url(string $path): string
    {
        return Storage::disk(self::disk())->url($path);
    }

    public static function delete(array|string $paths): void
    {
        Storage::disk(self::disk())->delete($paths);
    }

    /** Delete the file behind a stored URL, whichever disk it was uploaded to. Unknown URLs are ignored. */
    public static function deleteUrl(?string $url): void
    {
        if (! $url) {
            return;
        }
        $remote = rtrim((string) config('filesystems.disks.r2.url'), '/');
        if ($remote !== '' && str_starts_with($url, $remote.'/')) {
            // The public URL includes the disk's root folder, but disk paths are relative to it.
            $path = substr($url, strlen($remote) + 1);
            $root = trim((string) config('filesystems.disks.r2.root'), '/');
            if ($root !== '' && str_starts_with($path, $root.'/')) {
                $path = substr($path, strlen($root) + 1);
            }
            Storage::disk('r2')->delete($path);
        } elseif (($position = strpos($url, '/storage/')) !== false) {
            Storage::disk('public')->delete(substr($url, $position + strlen('/storage/')));
        }
    }
}
