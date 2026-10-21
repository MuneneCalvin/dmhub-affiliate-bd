import type { FeatureItem, FooterLink, HeroButton, HeroCheckmark, NavButton, StepItem } from '@/types/landing';
import { dashboard, login, register } from '@/routes';
import { LANDING_FEATURES, LANDING_HERO_CHECKMARKS, LANDING_STEPS } from './enums';
import {
    ArrowRight,
    BarChart3,
    Globe,
    LineChart,
    Shield,
    Users,
    Zap,
} from 'lucide-react';

export const LANDING_ICON_MAP: Record<string, React.ReactNode> = {
    BarChart3: <BarChart3 className="h-6 w-6" />,
    Zap: <Zap className="h-6 w-6" />,
    LineChart: <LineChart className="h-6 w-6" />,
    Shield: <Shield className="h-6 w-6" />,
    Globe: <Globe className="h-6 w-6" />,
    Users: <Users className="h-6 w-6" />,
};

export const LANDING_FEATURES_DATA: FeatureItem[] = LANDING_FEATURES.map((f) => ({
    icon: LANDING_ICON_MAP[f.iconName] ?? <BarChart3 className="h-6 w-6" />,
    title: f.title,
    description: f.desc,
}));

export const LANDING_STEPS_DATA: StepItem[] = LANDING_STEPS.map((s) => ({
    number: s.number,
    title: s.title,
    description: s.desc,
}));

export const LANDING_HERO_CHECKMARKS_DATA: HeroCheckmark[] = LANDING_HERO_CHECKMARKS.map(
    (text) => ({ text })
);

export const LANDING_FOOTER_LINKS: FooterLink[] = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Contact', href: '#' },
];

export const LANDING_HERO_BUTTONS: HeroButton[] = [
    {
        label: 'Start Vandaag',
        href: register(),
        variant: 'primary',
        icon: <ArrowRight className="h-4 w-4" />,
    },
    {
        label: 'Meer informatie',
        href: '#how-it-works',
        variant: 'secondary',
    },
];

export interface GetNavButtonsOptions {
    isAuthenticated: boolean;
    canRegister?: boolean;
}

export function getNavButtons({ isAuthenticated, canRegister = true }: GetNavButtonsOptions): NavButton[] {
    if (isAuthenticated) {
        return [
            {
                label: 'Dashboard',
                href: dashboard(),
                variant: 'primary',
                icon: <ArrowRight className="h-4 w-4" />,
            },
        ];
    }

    const buttons: NavButton[] = [
        {
            label: 'Inloggen',
            href: login(),
            variant: 'ghost',
        },
    ];

    if (canRegister) {
        buttons.push({
            label: 'Word Partner',
            href: register(),
            variant: 'primary',
            icon: <ArrowRight className="h-4 w-4" />,
        });
    }

    return buttons;
}
