import { CopyField } from '@/components/app';
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { QrCodeData, QrCodeModalProps } from '@/types';
import axios from 'axios';
import { Download, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const QrCodeModal = ({ componentProps }: QrCodeModalProps) => {
    const { t } = useTranslation();
    const { campaignId } = componentProps;
    const [loading, setLoading] = useState(true);
    const [qrData, setQrData] = useState<QrCodeData | null>(null);

    useEffect(() => {
        let active = true;
        axios
            .get(`/publishers/my/campaigns/${campaignId}/qr-code`)
            .then((response) => active && setQrData(response.data))
            .catch(() => active && setQrData(null))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [campaignId]);

    return (
        <>
            <DialogHeader icon={<QrCode />} tone="analytics">
                <DialogTitle>{t('QR code')}</DialogTitle>
                <DialogDescription>
                    {qrData?.offerName || t('Scan to open your tracking link.')}
                </DialogDescription>
            </DialogHeader>
            <div
                className="flex flex-col items-center gap-4 py-2"
                aria-busy={loading}
            >
                {loading ? (
                    <Skeleton className="size-48 rounded-card" />
                ) : qrData?.qrCode ? (
                    <>
                        <img
                            src={qrData.qrCode}
                            alt={t('QR code for {{campaign}}', {
                                campaign:
                                    qrData.campaignName ||
                                    t('your tracking link'),
                            })}
                            className="size-48 rounded-card border border-border bg-white p-2"
                        />
                        {qrData.campaignName && (
                            <p className="text-center text-sm font-bold">
                                {qrData.campaignName}
                            </p>
                        )}
                        {qrData.trackingLink && (
                            <CopyField
                                className="w-full"
                                label={t('Tracking link')}
                                value={qrData.trackingLink}
                                copiedMessage={t('Tracking link copied')}
                            />
                        )}
                        <Button variant="soft" asChild>
                            <a
                                href={qrData.qrCode}
                                download={`qr-code-${qrData.campaignName || 'tracking'}.png`}
                            >
                                <Download />
                                {t('Download QR code')}
                            </a>
                        </Button>
                    </>
                ) : (
                    <p role="status" className="text-sm text-ink-muted">
                        {t('QR code not available')}
                    </p>
                )}
            </div>
        </>
    );
};

export default QrCodeModal;
