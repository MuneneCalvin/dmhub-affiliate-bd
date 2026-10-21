import {
    DashboardPreview,
    LandingCTA,
    LandingFeatures,
    LandingFooter,
    LandingHero,
    LandingNavigation,
    LandingStats,
    LandingSteps,
} from '@/components/landing';
import { LanguageProvider } from '@/context/language-context';
import { register } from '@/routes';
import { type SharedData } from '@/types';
import { LANDING_NAV_LINKS, LANDING_STATS } from '@/utils/enums';
import {
    getNavButtons,
    LANDING_FEATURES_DATA,
    LANDING_FOOTER_LINKS,
    LANDING_HERO_BUTTONS,
    LANDING_HERO_CHECKMARKS_DATA,
    LANDING_STEPS_DATA,
} from '@/utils/landing-constants';
import { Head, usePage } from '@inertiajs/react';
import { ArrowRight, Wallet } from 'lucide-react';

export default function Welcome({ canRegister = true }: { canRegister?: boolean }) {
    const { auth } = usePage<SharedData>().props;

    const navButtons = getNavButtons({
        isAuthenticated: !!auth.user,
        canRegister,
    });

    return (
        <LanguageProvider>
            <Head title="Affiliate Marketing | Groei met ons mee" />
            <div className="min-h-screen bg-white dark:bg-[#0f1419]">
                <LandingNavigation
                    links={LANDING_NAV_LINKS}
                    buttons={navButtons}
                />
                <LandingHero
                    badge={{
                        icon: <Wallet className="h-4 w-4" />,
                        text: 'Transparant & Betrouwbaar',
                    }}
                    title="Verdien meer met"
                    highlightedText="eerlijke commissies"
                    description="Word partner van ons affiliate programma en profiteer van transparante commissies, snelle uitbetalingen en uitstekende support. Samen groeien we."
                    buttons={LANDING_HERO_BUTTONS}
                    checkmarks={LANDING_HERO_CHECKMARKS_DATA}
                    preview={<DashboardPreview />}
                />
                <LandingStats stats={LANDING_STATS} />
                <LandingFeatures
                    title="Waarom partners voor ons kiezen"
                    subtitle="Transparantie en betrouwbaarheid staan bij ons centraal. Ontdek wat ons affiliate programma uniek maakt."
                    features={LANDING_FEATURES_DATA}
                />
                <LandingSteps
                    title="Zo werkt het"
                    subtitle="In drie eenvoudige stappen ben je klaar om te verdienen."
                    steps={LANDING_STEPS_DATA}
                />
                <LandingCTA
                    title="Klaar om te beginnen?"
                    description="Sluit je aan bij duizenden partners die al profiteren van ons affiliate programma. Gratis aanmelden, direct starten."
                    buttonLabel="Meld je gratis aan"
                    buttonHref={register()}
                    buttonIcon={<ArrowRight className="h-5 w-5" />}
                />
                <LandingFooter links={LANDING_FOOTER_LINKS} />
            </div>
        </LanguageProvider>
    );
}
