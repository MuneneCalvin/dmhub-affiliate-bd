// Landing Page Components
export { default as LandingNavigation, NavigationButton } from './landing-navigation';
export { default as LandingHero } from './landing-hero';
export { default as LandingStats } from './landing-stats';
export { default as LandingFeatures } from './landing-features';
export { default as LandingSteps } from './landing-steps';
export { default as LandingCTA } from './landing-cta';
export { default as LandingFooter } from './landing-footer';
export { default as DashboardPreview } from './dashboard-preview';

export type {
    NavLink,
    NavButton,
    LandingNavigationProps,
    HeroBadge,
    HeroButton,
    HeroCheckmark,
    LandingHeroProps,
    StatItem,
    LandingStatsProps,
    FeatureItem,
    LandingFeaturesProps,
    StepItem,
    LandingStepsProps,
    LandingCTAProps,
    FooterLink,
    LandingFooterProps,
    DashboardPreviewProps,
} from '@/types/landing';