import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFilePreview } from '@/hooks/use-file-preview';
import { useTranslation } from 'react-i18next';

export function OfferThumbnailUpload({
    value,
    onChange,
    existingUrl,
    error,
}: {
    value?: File | null;
    onChange: (value: File | null) => void;
    existingUrl?: string | null;
    error?: string;
}) {
    const { t } = useTranslation();
    const preview = useFilePreview(value);
    const imageUrl = preview || existingUrl;
    return (
        <div className="space-y-3">
            <Label htmlFor="thumbnail" className="text-sm">
                {t('Offer thumbnail (optional)')}
            </Label>
            <div className="space-y-3 rounded-lg border border-dashed p-4">
                <Input
                    id="thumbnail"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="h-auto min-h-11 py-2"
                    onChange={(event) =>
                        onChange(event.target.files?.[0] ?? null)
                    }
                    aria-invalid={!!error}
                    aria-describedby={`thumbnail-hint${error ? ' thumbnail-error' : ''}`}
                />
                {value && <p className="text-sm break-all">{value.name}</p>}
                {imageUrl && !error && (
                    <img
                        src={imageUrl}
                        alt={t('Offer thumbnail')}
                        className="max-h-40 max-w-full rounded-lg object-contain"
                    />
                )}
            </div>
            <p id="thumbnail-hint" className="text-sm text-ink-muted">
                {t(
                    'JPG, PNG, GIF or WebP, up to 10 MB. The thumbnail URL is generated from your upload.',
                )}
            </p>
            {existingUrl && (
                <p className="text-sm text-ink-muted">
                    {t(
                        'The existing file is kept unless you upload a replacement.',
                    )}
                </p>
            )}
            {error && (
                <p
                    id="thumbnail-error"
                    role="alert"
                    className="text-sm text-danger-ink"
                >
                    {t(error)}
                </p>
            )}
        </div>
    );
}
