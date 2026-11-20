import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePage } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Shows the `finance` error that HandleFinanceErrors puts in the session when
 * a ledger transition is refused (409/422), e.g. an invoice that changed.
 */
export default function FinanceErrorNotice() {
    const { t } = useTranslation();
    const { errors } = usePage().props;
    return errors.finance ? (
        <Alert variant="danger">
            <AlertTriangle />
            <AlertTitle>{t('The finance action was not completed')}</AlertTitle>
            <AlertDescription>{errors.finance}</AlertDescription>
        </Alert>
    ) : null;
}
