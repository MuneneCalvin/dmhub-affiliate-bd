import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { QrCodeData, QrCodeModalProps } from '@/types';


const QrCodeModal = ({ componentProps }: QrCodeModalProps) => {
    const { t } = useTranslation();
    const { campaignId } = componentProps;

    const [loading, setLoading] = useState(true);
    const [qrData, setQrData] = useState<QrCodeData | null>(null);

    useEffect(() => {
        const fetchQrCode = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/publishers/my/campaigns/${campaignId}/qr-code`);
                setQrData(response.data);
            } catch (error) {
                console.error('Failed to fetch QR code:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchQrCode();
    }, [campaignId]);

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    {t('QR Code')}
                </DialogTitle>
                <DialogDescription>
                    {qrData?.offerName || t('Scan to access tracking link')}
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
                {loading ? (
                    <div className="flex h-48 w-48 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : qrData?.qrCode ? (
                    <>
                        <img
                            src={qrData.qrCode}
                            alt="Tracking Link QR Code"
                            className="h-48 w-48 rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                        <p className="text-center text-sm text-muted-foreground">
                            {qrData.campaignName}
                        </p>
                        {qrData.trackingLink && (
                            <p className="max-w-full break-all text-center text-xs text-muted-foreground">
                                {qrData.trackingLink}
                            </p>
                        )}
                        <a
                            href={qrData.qrCode}
                            download={`qr-code-${qrData.campaignName || 'tracking'}.png`}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            {t('Download QR Code')}
                        </a>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t('QR code not available')}
                    </p>
                )}
            </div>
        </>
    );
};

export default QrCodeModal;
