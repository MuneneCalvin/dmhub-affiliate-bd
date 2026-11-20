import { FileCheck2, Upload } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { IMAGE_UPLOAD, uploadError, type UploadRules } from './creative-types';

type CreativeDropZoneProps = {
    /** Called with a file that passed the type and size check. */
    onFile: (file: File) => void;
    /** Allowed types and size; defaults to images (10 MB). */
    rules?: UploadRules;
    /** Main line (default "Drop files to upload"). */
    title?: React.ReactNode;
    /** Name of the chosen file, shown instead of the hint. */
    fileName?: string | null;
    /** Server or parent error shown under the zone. */
    error?: string | null;
    disabled?: boolean;
    /** Explanation shown when disabled. */
    disabledReason?: string;
    /** `tile` fills a grid cell (library), `field` sits inside a form. */
    layout?: 'tile' | 'field';
    id?: string;
    className?: string;
    'aria-describedby'?: string;
};

/**
 * Dashed upload card. A real file input (visually hidden) is named by the
 * card's label, so it works with click, keyboard and drag-and-drop. Wrong
 * types or oversized files are rejected here with a message.
 */
function CreativeDropZone({
    onFile,
    rules = IMAGE_UPLOAD,
    title,
    fileName,
    error,
    disabled = false,
    disabledReason,
    layout = 'tile',
    id,
    className,
    'aria-describedby': describedBy,
}: CreativeDropZoneProps) {
    const { t } = useTranslation();
    const generatedId = React.useId();
    const inputId = id ?? `${generatedId}-file`;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [dragging, setDragging] = React.useState(false);
    const shownError = localError ?? error ?? null;

    const accept = (file: File | undefined | null) => {
        if (!file) return;
        const problem = uploadError(file, rules);
        if (problem) {
            setLocalError(t(problem));
            return;
        }
        setLocalError(null);
        onFile(file);
    };

    return (
        <div
            data-slot="creative-drop-zone"
            className={cn('flex flex-col gap-2', className)}
        >
            <label
                htmlFor={inputId}
                onDragOver={(event) => {
                    if (disabled) return;
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    if (!disabled) accept(event.dataTransfer.files?.[0]);
                }}
                data-dragging={dragging || undefined}
                data-invalid={shownError ? true : undefined}
                className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-brand/35 bg-surface-muted p-6 text-center text-ink transition-colors',
                    'focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft hover:border-brand/60 hover:bg-brand-soft/50',
                    'data-[dragging]:border-brand data-[dragging]:bg-brand-soft',
                    'data-[invalid]:border-danger-dot/60',
                    layout === 'tile' ? 'min-h-[320px]' : 'min-h-40',
                    disabled &&
                        'cursor-not-allowed opacity-60 hover:border-brand/35 hover:bg-surface-muted',
                )}
            >
                <span className="flex size-14 items-center justify-center rounded-[16px] bg-brand-soft text-brand">
                    {fileName ? (
                        <FileCheck2 className="size-6" aria-hidden="true" />
                    ) : (
                        <Upload className="size-6" aria-hidden="true" />
                    )}
                </span>
                <strong className="text-[15px]">
                    {title ?? t('Drop files to upload')}
                </strong>
                <span
                    id={hintId}
                    className={cn(
                        'text-[13px] text-ink-muted',
                        fileName && '[overflow-wrap:anywhere]',
                    )}
                >
                    {disabled && disabledReason
                        ? disabledReason
                        : fileName
                          ? fileName
                          : `${t('or click to choose a file')} · ${t(rules.hint)}`}
                </span>
                <input
                    id={inputId}
                    type="file"
                    accept={rules.accept}
                    disabled={disabled}
                    className="sr-only"
                    aria-invalid={shownError ? true : undefined}
                    aria-describedby={cn(
                        hintId,
                        shownError && errorId,
                        describedBy,
                    )}
                    onChange={(event) => {
                        accept(event.target.files?.[0]);
                        event.target.value = '';
                    }}
                />
            </label>
            {shownError && (
                <p
                    id={errorId}
                    role="alert"
                    className="text-sm font-medium text-danger-ink"
                >
                    {shownError}
                </p>
            )}
        </div>
    );
}

export { CreativeDropZone };
