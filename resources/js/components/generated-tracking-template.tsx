import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

export function trackingUrlTemplate(url: string) {
    if (!url.trim()) return '';
    try {
        if (!['http:', 'https:'].includes(new URL(url).protocol)) return '';
    } catch {
        return '';
    }
    const hash = url.indexOf('#');
    const fragment = hash >= 0 ? url.slice(hash) : '';
    const base = hash >= 0 ? url.slice(0, hash) : url;
    const question = base.indexOf('?');
    const path = question >= 0 ? base.slice(0, question) : base;
    const query = question >= 0 ? base.slice(question + 1) : '';
    const params = query.split('&').filter((part) => {
        if (!part) return false;
        try {
            return !['click_id', 'referral_id'].includes(
                decodeURIComponent(part.split('=')[0].replace(/\+/g, ' ')),
            );
        } catch {
            return true;
        }
    });
    return `${path}?${[...params, 'click_id={click_id}', 'referral_id={referral_id}'].join('&')}${fragment}`;
}

export function GeneratedTrackingTemplate({
    landingUrl,
}: {
    landingUrl: string;
}) {
    const { t } = useTranslation();
    return (
        <div className="space-y-2 rounded-lg bg-muted/40 p-4">
            <Label htmlFor="generated-tracking-template">
                {t('Tracking URL Template')} · {t('Generated automatically')}
            </Label>
            <Textarea
                id="generated-tracking-template"
                readOnly
                value={trackingUrlTemplate(landingUrl)}
                rows={3}
                placeholder={t(
                    'Enter a landing page URL to generate the template.',
                )}
                aria-describedby="generated-tracking-template-hint"
            />
            <p
                id="generated-tracking-template-hint"
                className="text-sm leading-relaxed text-muted-foreground"
            >
                {t(
                    'Generated from the landing page URL. DM Hub fills in click_id and referral_id for each tracked visit.',
                )}
            </p>
        </div>
    );
}
