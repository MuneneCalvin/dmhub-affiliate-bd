import AdvertiserTabsRegister from './register_tabs/advertiser_tabs';
import PublisherTabsRegister from './register_tabs/publisher_tabs';

export const PublisherTab = () => <PublisherTabsRegister type="publisher" />;
export const AdvertiserTab = () => <AdvertiserTabsRegister type="advertiser" />;