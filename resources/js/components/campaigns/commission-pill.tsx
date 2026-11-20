import { toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

const typeTones: Record<string, Tone> = {
    CPS: 'brand',
    RevShare: 'brand',
    CPA: 'partners',
    CPL: 'finance',
    CPC: 'analytics',
    Flat: 'admin',
};

/** Small square-ish pill naming a commission model ("CPS", "CPL"). */
function CommissionPill({
    type,
    className,
}: {
    type: string;
    className?: string;
}) {
    return (
        <span
            data-slot="commission-pill"
            className={cn(
                'inline-flex h-6 items-center rounded-[8px] px-2 text-xs font-extrabold',
                toneClasses[typeTones[type] ?? 'neutral'].soft,
                className,
            )}
        >
            {type}
        </span>
    );
}

export { CommissionPill };
