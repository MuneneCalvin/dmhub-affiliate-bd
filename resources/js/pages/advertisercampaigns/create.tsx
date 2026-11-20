import CampaignForm, {
    type CampaignFormProps,
} from '@/components/campaign-form';
import { usePage } from '@inertiajs/react';

export default function CreateCampaignPage() {
    const { auth, ...props } = usePage<
        CampaignFormProps & {
            auth: { user: { is_network: boolean; is_super_admin: boolean } };
        }
    >().props;
    return (
        <CampaignForm
            {...props}
            canSelectAdvertiser={
                auth.user.is_network || auth.user.is_super_admin
            }
        />
    );
}
