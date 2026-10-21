import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeBlock, CopyButton, InfoCardSkeleton, InfoRow, ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { BreadcrumbItem, ScriptDocsCampaign, ScriptDocsDocumentation } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle, Code, Download, Globe, Key, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';

const DocumentationPage = () => {
    const { t } = useTranslation();
    const { campaign, documentation, scriptToken, baseUrl } = usePage<{
        campaign: ScriptDocsCampaign;
        documentation: ScriptDocsDocumentation;
        scriptToken: string;
        baseUrl: string;
    }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Embed Scripts'),
            href: publisher.scripts.url(),
        },
        {
            title: campaign.name,
            href: publisher.scripts.show.url(campaign.id),
        },
        {
            title: t('Documentation'),
            href: publisher.scripts.docs.url(campaign.id),
        }
    ];

    const getPlatformIcon = (iconName: string) => {
        const icons: Record<string, string> = {
            html: '🌐',
            react: '⚛️',
            nextjs: '▲',
            vue: '💚',
            nuxt: '💚',
            angular: '🅰️',
            svelte: '🔥',
            wordpress: '📝',
            shopify: '🛍️',
            webflow: '🎨',
            gtm: '📊',
        };
        return icons[iconName] || '📄';
    };

    return (
        <AppLayout>
            <Head title={`${t("Documentation")} - ${campaign?.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('Integration Documentation')}
                    description={`${campaign?.name} - ${campaign?.offer}`}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="default"
                                onClick={() => window.open(publisher.scripts.download.url(campaign.id), '_blank')}>
                                <Download className="h-4 w-4 mr-1" />
                                {t('Download as Markdown')}
                            </Button>
                        </div>
                    }
                />
                <InfoCardSkeleton
                    icon={<Code className="h-5 w-5" />}
                    title={documentation.quick_start.title}
                    description={documentation.quick_start?.description}>
                    <CodeBlock code={documentation?.quick_start.code} />
                </InfoCardSkeleton>
                <InfoCardSkeleton
                    icon={<Globe className="h-5 w-5" />}
                    title={t('Platform-Specific Instructions')}
                    description={t('Choose your platform for detailed integration instructions')}
                    children={
                        <>
                            <Tabs defaultValue={documentation.platforms[0]?.name.toLowerCase().replace(/[\s/]/g, '-')} className="w-full">
                                <TabsList className="flex flex-wrap h-auto gap-2 mb-4">
                                    {documentation.platforms.map((platform) => (
                                        <TabsTrigger
                                            key={platform.name}
                                            value={platform.name.toLowerCase().replace(/[\s/]/g, '-')}
                                            className="flex items-center gap-1"
                                        >
                                            <span>{getPlatformIcon(platform.icon)}</span>
                                            {platform.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                {documentation.platforms.map((platform) => (
                                    <TabsContent
                                        key={platform.name}
                                        value={platform.name.toLowerCase().replace(/[\s/]/g, '-')}
                                        className="space-y-4"
                                    >
                                        <p className="text-sm text-muted-foreground">{platform.instructions}</p>
                                        <CodeBlock code={platform.code} />
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </>
                    } />

                <InfoCardSkeleton
                    icon={<Code className="h-5 w-5" />}
                    title={documentation.exclude_forms.title}
                    description={documentation.exclude_forms.description}
                children={
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {documentation.exclude_forms.methods.map((method) => (
                            <div key={method.name} className="space-y-2">
                                <h4 className="font-medium text-sm">{method.name}</h4>
                                <CodeBlock code={method.code} />
                            </div>
                        ))}
                    </div>
                }/>

                <div className="grid gap-6 lg:grid-cols-2">
                    <InfoCardSkeleton
                        icon={<Code className="h-5 w-5" />}
                        title={documentation.manual_trigger.title}
                        description={documentation.manual_trigger.description}>
                        <CodeBlock code={documentation?.manual_trigger.code} language="javascript" />
                    </InfoCardSkeleton>

                    <InfoCardSkeleton
                        icon={<Code className="h-5 w-5" />}
                        title={documentation.api_direct.title}
                        description={documentation.api_direct.description}>
                        <CodeBlock code={documentation.api_direct.code} language="javascript" />
                    </InfoCardSkeleton>
                </div>
                <InfoCardSkeleton
                    icon={<Terminal className="h-5 w-5" />}
                    title={documentation.testing.title}
                    description={documentation.testing.description}
                >
                    <ol className="list-none space-y-2">
                        {documentation.testing.steps.map((step, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                </InfoCardSkeleton>
                <InfoCardSkeleton
                    icon={<AlertTriangle className="h-5 w-5" />}
                    title={documentation.troubleshooting.title}
                    description={t('Common issues and their solutions')}
                >
                    <div className="space-y-6">
                        {documentation.troubleshooting.issues.map((issue, index) => (
                            <div key={index} className="border-l-4 border-yellow-500 pl-4">
                                <h4 className="font-medium text-sm mb-2">{issue.problem}</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {issue.solutions.map((solution, sIndex) => (
                                        <li key={sIndex}>{solution}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </InfoCardSkeleton>
                <InfoCardSkeleton
                    icon={<Key className="h-5 w-5" />}
                    title={t('Reference Information')}
                    description={t('Your unique identifiers for this campaign')}
                >
                    <InfoRow
                        label={t('Script Token')}
                        value={
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                    {scriptToken}
                                </code>
                                <CopyButton text={scriptToken} />
                            </div>
                        }
                        icon={Key}
                    />
                    <Separator />
                    <InfoRow
                        label={t('Base URL')}
                        value={
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                                    {baseUrl}
                                </code>
                                <CopyButton text={baseUrl} />
                            </div>
                        }
                        icon={Globe}
                    />
                </InfoCardSkeleton>
            </div>
        </AppLayout>
    );
};

export default DocumentationPage;
