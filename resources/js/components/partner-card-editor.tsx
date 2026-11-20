import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export type CardField = {
    name: string;
    label: string;
    value: string | boolean;
    type?:
        | 'text'
        | 'email'
        | 'url'
        | 'number'
        | 'textarea'
        | 'checkbox'
        | 'select';
    required?: boolean;
    maxLength?: number;
    min?: number;
    max?: number;
    step?: string;
    options?: { value: string; label: string; disabled?: boolean }[];
    description?: string;
};
export type CardEditorConfig = {
    title: string;
    url: string;
    fields: CardField[];
    description?: string;
    data?: Record<string, string | boolean>;
};
export function PartnerCardEditor({
    config,
    onClose,
}: {
    config: CardEditorConfig;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const prefix = useId();
    const form = useForm<Record<string, string | boolean>>({
        ...config.data,
        ...Object.fromEntries(
            config.fields.map((field) => [field.name, field.value]),
        ),
    });
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open && !form.processing) onClose();
            }}
        >
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {t('Edit {{section}}', { section: t(config.title) })}
                    </DialogTitle>
                    <DialogDescription>
                        {t(
                            config.description ??
                                'Update the details in this card.',
                        )}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.patch(config.url, {
                            preserveScroll: true,
                            onSuccess: onClose,
                        });
                    }}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {config.fields.map((field) => {
                            const id = `${prefix}-${field.name}`;
                            const errorId = `${id}-error`;
                            const hintId = `${id}-hint`;
                            const accessibility = {
                                id,
                                'aria-invalid': !!form.errors[field.name],
                                'aria-describedby':
                                    [
                                        form.errors[field.name] ? errorId : '',
                                        field.description ? hintId : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ') || undefined,
                            };
                            return (
                                <div
                                    key={field.name}
                                    className={
                                        field.type === 'textarea' ||
                                        field.type === 'checkbox'
                                            ? 'space-y-2 sm:col-span-2'
                                            : 'space-y-2'
                                    }
                                >
                                    {field.type === 'checkbox' ? (
                                        <div className="flex items-center gap-3">
                                            <input
                                                {...accessibility}
                                                type="checkbox"
                                                className="size-4 accent-primary"
                                                checked={
                                                    !!form.data[field.name]
                                                }
                                                onChange={(event) =>
                                                    form.setData(
                                                        field.name,
                                                        event.target.checked,
                                                    )
                                                }
                                            />
                                            <Label htmlFor={id}>
                                                {t(field.label)}
                                            </Label>
                                        </div>
                                    ) : (
                                        <>
                                            <Label htmlFor={id}>
                                                {t(field.label)}
                                            </Label>
                                            {field.type === 'textarea' ? (
                                                <Textarea
                                                    {...accessibility}
                                                    value={String(
                                                        form.data[field.name],
                                                    )}
                                                    rows={4}
                                                    maxLength={field.maxLength}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            field.name,
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            ) : field.type === 'select' ? (
                                                <Select
                                                    value={
                                                        String(
                                                            form.data[
                                                                field.name
                                                            ],
                                                        ) || '__none__'
                                                    }
                                                    onValueChange={(value) =>
                                                        form.setData(
                                                            field.name,
                                                            value === '__none__'
                                                                ? ''
                                                                : value,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        {...accessibility}
                                                        className="h-10 w-full rounded-md border bg-surface px-3"
                                                    >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {field.options?.map(
                                                            (option) => (
                                                                <SelectItem
                                                                    key={
                                                                        option.value
                                                                    }
                                                                    value={
                                                                        option.value ||
                                                                        '__none__'
                                                                    }
                                                                    disabled={
                                                                        option.disabled
                                                                    }
                                                                >
                                                                    {t(
                                                                        option.label,
                                                                    )}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    {...accessibility}
                                                    type={field.type ?? 'text'}
                                                    required={field.required}
                                                    maxLength={field.maxLength}
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step}
                                                    value={String(
                                                        form.data[field.name],
                                                    )}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            field.name,
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            )}
                                        </>
                                    )}
                                    {field.description && (
                                        <p
                                            id={hintId}
                                            className="text-xs text-ink-muted"
                                        >
                                            {t(field.description)}
                                        </p>
                                    )}
                                    <InputError
                                        id={errorId}
                                        message={form.errors[field.name]}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    {Object.entries(form.errors)
                        .filter(
                            ([key]) =>
                                !config.fields.some(
                                    (field) => field.name === key,
                                ),
                        )
                        .map(([key, message]) => (
                            <p
                                key={key}
                                role="alert"
                                className="text-sm text-danger-ink"
                            >
                                {message}
                            </p>
                        ))}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            type="button"
                            disabled={form.processing}
                            onClick={onClose}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {t(form.processing ? 'Saving…' : 'Save changes')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function profileCardFields(account: {
    first_name: string;
    last_name: string;
    user_name: string;
    email: string;
    title: string | null;
    country_iso: string | null;
    timezone: string | null;
    language: string | null;
}): CardField[] {
    return [
        {
            name: 'first_name',
            label: 'First name',
            value: account.first_name,
            required: true,
            maxLength: 30,
        },
        {
            name: 'last_name',
            label: 'Last name',
            value: account.last_name,
            required: true,
            maxLength: 30,
        },
        {
            name: 'user_name',
            label: 'Username',
            value: account.user_name,
            required: true,
            maxLength: 50,
        },
        {
            name: 'email',
            label: 'Email',
            value: account.email,
            type: 'email',
            required: true,
            maxLength: 255,
            description:
                'Changing the email address requires verification again.',
        },
        {
            name: 'title',
            label: 'Title',
            value: account.title ?? '',
            maxLength: 50,
        },
        {
            name: 'country_iso',
            label: 'Country code',
            value: account.country_iso ?? '',
            maxLength: 3,
            description: 'Use a three-letter country code, for example NLD.',
        },
        {
            name: 'timezone',
            label: 'Timezone',
            value: account.timezone ?? '',
            maxLength: 50,
            description: 'For example Europe/Amsterdam.',
        },
        {
            name: 'language',
            label: 'Language',
            value: account.language ?? '',
            type: 'select',
            options: [
                { value: '', label: 'Not set' },
                { value: 'en', label: 'English' },
                { value: 'nl', label: 'Dutch' },
            ],
        },
    ];
}
