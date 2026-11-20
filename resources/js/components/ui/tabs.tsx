import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { cn } from '@/lib/utils';

type TabsVariant = 'underline' | 'segmented';
const TabsVariantContext = React.createContext<TabsVariant>('underline');

function Tabs({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            className={cn('flex flex-col gap-5', className)}
            {...props}
        />
    );
}

/**
 * Page tabs. `underline` (default) is the design's page tab bar; `segmented`
 * is a tinted track with a white selected pill, for small in-card switches.
 */
function TabsList({
    className,
    variant = 'underline',
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
    variant?: TabsVariant;
}) {
    return (
        <TabsVariantContext.Provider value={variant}>
            <TabsPrimitive.List
                data-slot="tabs-list"
                data-variant={variant}
                className={cn(
                    'flex max-w-full items-center overflow-x-auto',
                    variant === 'underline' &&
                        'w-full justify-start gap-1 border-b border-border',
                    variant === 'segmented' &&
                        'w-fit gap-0.5 rounded-control bg-surface-tint p-1',
                    className,
                )}
                {...props}
            />
        </TabsVariantContext.Provider>
    );
}

function TabsTrigger({
    className,
    icon,
    count,
    children,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
    /** Leading icon element. */
    icon?: React.ReactNode;
    /** Count shown in a pill after the label. */
    count?: React.ReactNode;
}) {
    const variant = React.useContext(TabsVariantContext);

    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 text-sm whitespace-nowrap transition-[color,box-shadow,background-color] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                variant === 'underline' &&
                    'h-11 rounded-t-[10px] px-3.5 font-semibold text-ink-muted hover:text-ink data-[state=active]:font-bold data-[state=active]:text-brand-ink data-[state=active]:shadow-[inset_0_-3px_0_var(--brand-base)]',
                variant === 'segmented' &&
                    'h-9 rounded-[9px] px-3.5 font-semibold text-ink-muted hover:text-ink data-[state=active]:bg-surface data-[state=active]:font-bold data-[state=active]:text-brand-ink data-[state=active]:shadow-[0_1px_3px_rgba(23,19,59,0.12)]',
                className,
            )}
            {...props}
        >
            {icon}
            {children}
            {count !== undefined && count !== null && (
                <span
                    data-slot="tabs-count"
                    className="rounded-full bg-surface-tint px-[7px] text-[11px] leading-[18px] font-bold text-ink"
                >
                    {count}
                </span>
            )}
        </TabsPrimitive.Trigger>
    );
}

function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn('flex-1 outline-none', className)}
            {...props}
        />
    );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
