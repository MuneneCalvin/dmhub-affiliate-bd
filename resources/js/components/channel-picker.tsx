import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PUBLISHER_CHANNELS, type ChannelType } from '@/lib/publisher-channels';
import { useTranslation } from 'react-i18next';

export type ChannelValues = Partial<Record<ChannelType, string>>;
export type ChannelErrors = Partial<Record<ChannelType | 'channels', string>>;

/** Pick the channels you promote on; each ticked one asks for its URL or account name. */
export function ChannelPicker({
    values,
    errors,
    onChange,
}: {
    values: ChannelValues;
    errors: ChannelErrors;
    onChange: (next: ChannelValues) => void;
}) {
    const { t } = useTranslation();

    return (
        <fieldset className="grid gap-2.5">
            <legend className="mb-1 text-sm font-semibold text-ink">
                {t('Where will you promote?')}
            </legend>
            <p className="-mt-1 text-[13px] text-ink-muted">
                {t(
                    'Choose every channel you use and tell us where to find it.',
                )}
            </p>
            {PUBLISHER_CHANNELS.map((channel) => {
                const ticked = channel.value in values;
                const id = `channel-${channel.value}`;
                const message = errors[channel.value];
                return (
                    <div key={channel.value} className="grid gap-1.5">
                        <div className="flex items-center gap-2.5">
                            <Checkbox
                                id={id}
                                checked={ticked}
                                onCheckedChange={(checked) => {
                                    const next = { ...values };
                                    if (checked === true)
                                        next[channel.value] = '';
                                    else delete next[channel.value];
                                    onChange(next);
                                }}
                            />
                            <Label htmlFor={id}>{t(channel.label)}</Label>
                        </div>
                        {ticked && (
                            <div className="ms-8 grid gap-1.5">
                                <Label
                                    htmlFor={`${id}-handle`}
                                    className="text-[13px] text-ink-muted"
                                >
                                    {t('{{channel}}: URL or account name', {
                                        channel: t(channel.label),
                                    })}
                                </Label>
                                <Input
                                    id={`${id}-handle`}
                                    value={values[channel.value] ?? ''}
                                    placeholder={channel.placeholder}
                                    aria-invalid={message ? true : undefined}
                                    aria-describedby={
                                        message ? `${id}-error` : undefined
                                    }
                                    onChange={(event) =>
                                        onChange({
                                            ...values,
                                            [channel.value]: event.target.value,
                                        })
                                    }
                                />
                                <InputError
                                    id={`${id}-error`}
                                    message={message ? t(message) : undefined}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
            <InputError
                message={errors.channels ? t(errors.channels) : undefined}
            />
        </fieldset>
    );
}
