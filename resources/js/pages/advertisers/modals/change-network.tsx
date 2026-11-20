import { ChangeNetworkForm } from '@/components/change-network-form';

/** CustomDialogComponent content: move an advertiser to another network. */
export const ChangeNetworkModal = ({
    componentProps,
    handleDialogContextSwitch,
}: {
    componentProps?: {
        entityId?: number | string;
        currentNetworkId?: number | string | null;
    };
    handleDialogContextSwitch: (payload?: { state?: boolean }) => void;
}) => (
    <ChangeNetworkForm
        kind="advertiser"
        id={componentProps?.entityId ?? 0}
        currentNetworkId={componentProps?.currentNetworkId}
        onDone={() => handleDialogContextSwitch({})}
    />
);
