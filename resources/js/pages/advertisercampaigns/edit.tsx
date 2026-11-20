import CampaignForm, {
    type CampaignFormProps,
} from '@/components/campaign-form';
import { TCampaign } from '@/types';
import { usePage } from '@inertiajs/react';

export default function EditCampaignPage() {
    const props = usePage<CampaignFormProps & { campaign: TCampaign }>().props;
    return <CampaignForm {...props} />;
}
