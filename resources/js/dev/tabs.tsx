
import { AdvertiserTab, PublisherTab } from "@/pages/auth/register_tabs";
import { TTab } from "@/types";
import {  EREGISTER_TYPE } from "@/utils/enums";

export const RegisterTabs: TTab<EREGISTER_TYPE>[] = [
	{
		key: EREGISTER_TYPE.PUBLISHER,
		title: EREGISTER_TYPE.PUBLISHER,
		Tab: PublisherTab,
	},
	{
		key: EREGISTER_TYPE.ADVERTISER,
		title: EREGISTER_TYPE.ADVERTISER,
		Tab: AdvertiserTab,
	},
];

import { ESTATUSTABS } from "@/utils/enums";
import ApplicationTableContent from "@/pages/applications/table_content";

export const ReviewApplicationTabs: TTab[] = Object.entries(ESTATUSTABS).map(
    ([key, value]) => ({
        key,
        title: value,
        Tab: ApplicationTableContent,
    })
);
