import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import advertisers from '@/routes/advertisers';
import publishers from '@/routes/publishers';
import type { SharedData, TNetwork } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { ArrowLeftRight, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Moves an advertiser or publisher to another network (platform admins only;
 * the route enforces it). Rendered inside a Dialog / CustomDialogComponent.
 */
export function ChangeNetworkForm({
    kind,
    id,
    currentNetworkId,
    onDone,
}: {
    kind: 'advertiser' | 'publisher';
    /** advertisers.id / publishers.id */
    id: number | string;
    currentNetworkId?: number | string | null;
    onDone: () => void;
}) {
    const { t } = useTranslation();
    const { networks = [] } = usePage<SharedData & { networks?: TNetwork[] }>()
        .props;
    const form = useForm({
        network_id: currentNetworkId ? String(currentNetworkId) : '',
    });
    const unchanged =
        !form.data.network_id ||
        form.data.network_id === String(currentNetworkId ?? '');

    return (
        <form
            className="grid gap-5"
            onSubmit={(event) => {
                event.preventDefault();
                const url =
                    kind === 'advertiser'
                        ? advertisers.change.network.url(Number(id))
                        : publishers.change.network.url(Number(id));
                form.post(url, { preserveScroll: true, onSuccess: onDone });
            }}
        >
            <DialogHeader icon={<ArrowLeftRight />} tone="partners">
                <DialogTitle>{t('Change network')}</DialogTitle>
                <DialogDescription>
                    {t(
                        kind === 'advertiser'
                            ? 'Move this advertiser and its campaigns to another network.'
                            : 'Move this publisher to another network.',
                    )}
                </DialogDescription>
            </DialogHeader>
            {networks.length === 0 ? (
                <p className="text-sm text-ink-muted">
                    {t('No networks available.')}
                </p>
            ) : (
                <RadioCardGroup
                    name="network_id"
                    label={t('Network')}
                    value={form.data.network_id}
                    onValueChange={(value) => form.setData('network_id', value)}
                    className="grid gap-2.5 sm:grid-cols-2"
                >
                    {networks.map((network) => (
                        <RadioCard
                            key={network.id}
                            value={String(network.id)}
                            title={network.network_name}
                            hint={
                                String(network.id) ===
                                String(currentNetworkId ?? '')
                                    ? t('Current network')
                                    : undefined
                            }
                            icon={<Network />}
                            tone="partners"
                        />
                    ))}
                </RadioCardGroup>
            )}
            <InputError message={form.errors.network_id} />
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={onDone}>
                    {t('Cancel')}
                </Button>
                <Button type="submit" disabled={unchanged || form.processing}>
                    {form.processing ? t('Saving…') : t('Change network')}
                </Button>
            </DialogFooter>
        </form>
    );
}
