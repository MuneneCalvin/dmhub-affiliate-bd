import { usePage } from '@inertiajs/react';

export default function FinanceErrorNotice() {
    const { errors } = usePage().props;
    return errors.finance ? (
        <p
            role="alert"
            className="rounded-xl border border-destructive p-4 text-destructive"
        >
            {errors.finance}
        </p>
    ) : null;
}
