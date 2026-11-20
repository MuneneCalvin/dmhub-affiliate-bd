import { ChangeNetworkForm } from '@/components/change-network-form';

/** CustomDialogComponent content: move a publisher to another network. */
export const ChangeNetworkModal = ({
    componentProps,
    handleDialogContextSwitch,
}: {
    componentProps?: {
        data?: { id?: number | string; publisher_id?: number | string };
        currentNetworkId?: number | string | null;
    };
    handleDialogContextSwitch: (payload?: { state?: boolean }) => void;
}) => (
    <ChangeNetworkForm
        kind="publisher"
        id={componentProps?.data?.id ?? componentProps?.data?.publisher_id ?? 0}
        currentNetworkId={componentProps?.currentNetworkId}
        onDone={() => handleDialogContextSwitch({})}
    />
);
