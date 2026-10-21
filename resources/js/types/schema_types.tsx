import { advertiserSchema,
    campaignApplicationSchema,
    campaignSchema,
    campaignTermsSchema,
    changeNetworkSchema,
    commissionnSchema,
    creativeSchema,
    networkSchema,
    networkUsersSchema,
    offersSchema,
    publisherSchema,
    registerUserSchema
} from '@/utils/form-schema';
import z from 'zod';

export type TRegisterUserTypes = z.infer<typeof registerUserSchema>;
export type TNetworkOnboardingTypes = z.infer<typeof networkSchema>;
export type TAdvertiserOnboardingTypes = z.infer<typeof advertiserSchema>;
export type TPublisherOnboardingTypes = z.infer<typeof publisherSchema>;
export type TChangeNetworkTypes = z.infer<typeof changeNetworkSchema>;
export type TNetworkUserTypes = z.infer<typeof networkUsersSchema>;
export type CampaignFormValues = z.infer<typeof campaignSchema>;

export type OffersFormValueTypes = z.infer<typeof offersSchema>;
export type CommissionFormValuesTypes = z.infer<typeof commissionnSchema>;
export type CampaignApplicationTypes = z.infer<typeof campaignApplicationSchema>;
export type CreativeFormValuesTypes = z.infer<typeof creativeSchema>;
export type TCampaignTermsTypes = z.infer<typeof campaignTermsSchema>;
