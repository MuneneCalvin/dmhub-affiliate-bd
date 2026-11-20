import * as React from 'react';

import { controlClasses } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                controlClasses,
                'flex field-sizing-content min-h-24 px-3.5 py-3',
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
