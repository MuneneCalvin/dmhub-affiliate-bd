/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLanguage } from '@/context/language-context';
import { ReusableCheckBoxGroup } from '@/dev/core';
import advertisers from '@/routes/advertisers';
import { SharedData, TNetwork } from '@/types';
import { changeNetworkSchema } from '@/utils/form-schema';
import { router, usePage } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';


const isSuperAdmin = (value: unknown): boolean =>
    value === true || value === 1 || value === '1' || value === 'Y';

export const ChangeNetworkModal = ({
    componentProps,
    handleDialogContextSwitch,
}: {
    componentProps?: {
        entityId?: number | string;
        currentNetworkId?: number | string | null;
        data?: any;
    };
    handleDialogContextSwitch: (payload?: { state?: boolean }) => void;
}) => {
    const { __ } = useLanguage();

    console.log('ChangeNetworkModal Props:', componentProps);
    
    const { networks = [], auth } =
        usePage<SharedData & { networks?: TNetwork[] }>().props;

    const currentNetworkId = componentProps?.currentNetworkId
        ? String(componentProps.currentNetworkId)
        : '';

    const canChangeNetwork = isSuperAdmin(auth?.user?.is_super_admin);

    const [selectedNetworks, setSelectedNetworks] = useState<string[]>(
        currentNetworkId ? [currentNetworkId] : []
    );

    const [error, setError] = useState<string>('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setSelectedNetworks(currentNetworkId ? [currentNetworkId] : []);
    }, [currentNetworkId]);

    const options = useMemo(
        () =>
            networks.map((network) => ({
                label: network.network_name,
                value: String(network.id),
            })),
        [networks]
    );

    const submitNetworkChange = (networkId: string) => {
        const id = componentProps?.entityId ? String(componentProps.entityId) : null;

        if (!id) {
            setError(__('Advertiser ID missing. Unable to update network.'));
            return;
        }

        const validation = changeNetworkSchema.safeParse({
            network_id: networkId,
        });

        if (!validation.success) {
            setError(
                validation.error.flatten().fieldErrors.network_id?.[0] ??
                __('Network is required')
            );
            return;
        }

        setError('');
        setProcessing(true);
        const url = advertisers.change.network.url(id); 

        router.post(
            url,
            { network_id: networkId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    handleDialogContextSwitch?.({ state: false });
                    window.location.reload();
                },
                onFinish: () => {
                    setProcessing(false);
                },
            }
        );
    };

    const handleChange = (nextSelected: string[]) => {
        if (!canChangeNetwork || processing || nextSelected.length === 0) return;

        const selected = nextSelected[0];

        if (selected === selectedNetworks[0]) return;

        setSelectedNetworks([selected]);
        submitNetworkChange(selected);
    };

    return (
        <div className="w-full p-4">
            <div className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                        {__('Change Network')}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                        {__(
                            'Select another network to assign to this account. Changes save automatically.'
                        )}
                    </p>

                    {!canChangeNetwork && (
                        <p className="text-sm text-destructive">
                            {__('Only super admins can change networks.')}
                        </p>
                    )}
                </div>

                {!networks.length ? (
                    <p className="text-sm text-muted-foreground">
                        {__('No networks available.')}
                    </p>
                ) : (
                    <ReusableCheckBoxGroup<string>
                        options={options}
                        value={selectedNetworks}
                        onChange={handleChange}
                        single
                        className={
                            processing ? 'pointer-events-none opacity-70' : ''
                        }
                    />
                )}

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
            </div>
        </div>
    );
};