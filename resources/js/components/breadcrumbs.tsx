import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link } from '@inertiajs/react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

/** Trail of links; the last crumb is the current page and is not a link. */
export function Breadcrumbs({
    breadcrumbs,
    className,
}: {
    breadcrumbs: BreadcrumbItemType[];
    className?: string;
}) {
    const { t } = useTranslation();
    if (breadcrumbs.length === 0) return null;
    return (
        <Breadcrumb aria-label={t('Breadcrumb')} className={className}>
            <BreadcrumbList>
                {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                        <Fragment key={`${index}-${item.title}`}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>
                                        {item.title}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={item.href}>
                                            {item.title}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
