import { PoolDirectory, type PoolPartner } from '@/components/pool-directory';
import type { LaravelPage } from '@/hooks/use-directory-query';

export default function PoolPublishersPage({
    publishers,
}: {
    publishers: LaravelPage<PoolPartner>;
}) {
    return <PoolDirectory kind="publishers" partners={publishers} />;
}
