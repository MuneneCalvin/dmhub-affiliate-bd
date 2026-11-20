import { ImageUp, X } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Object URL for a selected file, revoked when it changes or unmounts. */
export function useObjectUrl(file: File | null | undefined): string | null {
    const url = React.useMemo(
        () =>
            file && typeof URL.createObjectURL === 'function'
                ? URL.createObjectURL(file)
                : null,
        [file],
    );
    React.useEffect(
        () => () => {
            if (url) URL.revokeObjectURL(url);
        },
        [url],
    );
    return url;
}

type ImageUploadFieldProps = {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    /** Image currently saved on the server. */
    currentUrl?: string | null;
    /** Newly chosen file (not saved yet). */
    file: File | null;
    onFileChange: (file: File | null) => void;
    accept?: string;
    /** Thumbnail shape: `wide` for logos, `square` for icons. */
    shape?: 'wide' | 'square';
    className?: string;
};

/**
 * Image picker with a thumbnail of the saved or newly chosen image. The file
 * input is visually hidden but keeps its label, so it stays keyboard and
 * screen-reader operable.
 */
function ImageUploadField({
    id,
    label,
    hint,
    error,
    currentUrl,
    file,
    onFileChange,
    accept = 'image/*',
    shape = 'wide',
    className,
}: ImageUploadFieldProps) {
    const { t } = useTranslation();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const preview = useObjectUrl(file);
    const shown = preview ?? currentUrl ?? null;
    const describedBy =
        [hint && `${id}-hint`, error && `${id}-error`]
            .filter(Boolean)
            .join(' ') || undefined;

    return (
        <div
            data-slot="image-upload-field"
            className={cn(
                'flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-surface-muted p-4',
                className,
            )}
        >
            <div className="flex items-start gap-3">
                <span
                    className={cn(
                        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface',
                        shape === 'wide' ? 'h-14 w-24' : 'size-14',
                    )}
                >
                    {shown ? (
                        <img
                            src={shown}
                            alt={
                                preview
                                    ? t('New {{field}}', { field: label })
                                    : t('Current {{field}}', { field: label })
                            }
                            className="max-h-full max-w-full object-contain p-1.5"
                        />
                    ) : (
                        <ImageUp
                            className="size-5 text-ink-muted"
                            aria-hidden="true"
                        />
                    )}
                </span>
                <div className="min-w-0 flex-1">
                    <label htmlFor={id} className="text-sm font-bold text-ink">
                        {label}
                    </label>
                    <p className="text-xs [overflow-wrap:anywhere] text-ink-muted">
                        {file
                            ? t('Selected: {{name}}', { name: file.name })
                            : currentUrl
                              ? t('Saved')
                              : t('Not uploaded yet')}
                    </p>
                </div>
            </div>
            <input
                ref={inputRef}
                id={id}
                type="file"
                accept={accept}
                aria-describedby={describedBy}
                aria-invalid={error ? true : undefined}
                className="sr-only"
                onChange={(event) => {
                    onFileChange(event.target.files?.[0] ?? null);
                    event.target.value = '';
                }}
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    aria-label={
                        shown
                            ? t('Replace {{field}}', { field: label })
                            : t('Upload {{field}}', { field: label })
                    }
                    onClick={() => inputRef.current?.click()}
                >
                    <ImageUp aria-hidden="true" />
                    {shown ? t('Replace') : t('Upload')}
                </Button>
                {file && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={t('Undo {{field}} selection', {
                            field: label,
                        })}
                        onClick={() => onFileChange(null)}
                    >
                        <X aria-hidden="true" />
                        {t('Undo')}
                    </Button>
                )}
            </div>
            {hint && (
                <p id={`${id}-hint`} className="text-xs text-ink-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p
                    id={`${id}-error`}
                    className="text-[13px] font-semibold text-danger-ink"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

export { ImageUploadField };
