import { PoolDirectory, type PoolPartner } from '@/components/pool-directory';
import type { LaravelPage } from '@/hooks/use-directory-query';

export default function PoolAdvertisersPage({
    advertisers,
}: {
    advertisers: LaravelPage<PoolPartner>;
}) {
    return <PoolDirectory kind="advertisers" partners={advertisers} />;
}
