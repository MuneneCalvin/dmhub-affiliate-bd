import { type ReactNode } from 'react';
import { type InertiaLinkProps } from '@inertiajs/react';

// Generic href type that accepts both strings and Inertia route definitions
export type HrefType = NonNullable<InertiaLinkProps['href']>;

// ==================== Navigation Types ====================

export interface NavLink {
    label: string;
    href: string;
    isExternal?: boolean;
}

export interface NavButton {
    label: string;
    href: HrefType;
    variant: 'primary' | 'secondary' | 'ghost';
    icon?: ReactNode;
    showWhen?: 'always' | 'authenticated' | 'unauthenticated';
}

export interface LandingNavigationProps {
    links?: NavLink[];
    buttons?: NavButton[];
    logo?: ReactNode;
    className?: string;
}

// ==================== Hero Types ====================

export interface HeroBadge {
    icon?: ReactNode;
    text: string;
}

export interface HeroButton {
    label: string;
    href: HrefType;
    variant: 'primary' | 'secondary';
    icon?: ReactNode;
}

export interface HeroCheckmark {
    text: string;
}

export interface LandingHeroProps {
    badge?: HeroBadge;
    title: ReactNode;
    highlightedText?: string;
    description: string;
    buttons?: HeroButton[];
    checkmarks?: HeroCheckmark[];
    preview?: ReactNode;
    className?: string;
}

// ==================== Stats Types ====================

export interface StatItem {
    value: string;
    label: string;
}

export interface LandingStatsProps {
    stats: StatItem[];
    id?: string;
    className?: string;
}

// ==================== Features Types ====================

export interface FeatureItem {
    icon: ReactNode;
    title: string;
    description: string;
}

export interface LandingFeaturesProps {
    title?: string;
    subtitle?: string;
    features: FeatureItem[];
    id?: string;
    className?: string;
    columns?: 2 | 3 | 4;
}

// ==================== Steps Types ====================

export interface StepItem {
    number: string;
    title: string;
    description: string;
}

export interface LandingStepsProps {
    title?: string;
    subtitle?: string;
    steps: StepItem[];
    id?: string;
    className?: string;
}

// ==================== CTA Types ====================

export interface LandingCTAProps {
    title: string;
    description: string;
    buttonLabel: string;
    buttonHref: HrefType;
    buttonIcon?: ReactNode;
    className?: string;
}

// ==================== Footer Types ====================

export interface FooterLink {
    label: string;
    href: string;
}

export interface LandingFooterProps {
    logo?: ReactNode;
    brandName?: ReactNode;
    links?: FooterLink[];
    copyright?: string;
    className?: string;
}

// ==================== Dashboard Preview Types ====================

export interface DashboardPreviewProps {
    totalEarnings?: string;
    growthPercentage?: string;
    stats?: {
        clicks: string;
        conversions: string;
        ratio: string;
    };
    chartData?: number[];
    floatingCard?: {
        label: string;
        value: string;
        icon?: ReactNode;
    };
    className?: string;
}

// ==================== Landing Page Data Types (for enums) ====================

export interface LandingFeatureData {
    iconName: string;
    title: string;
    desc: string;
}

export interface LandingStatData {
    value: string;
    label: string;
}

export interface LandingStepData {
    number: string;
    title: string;
    desc: string;
}
