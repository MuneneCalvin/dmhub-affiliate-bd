import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { HTMLAttributes } from 'react';

interface AppLogoIconProps extends HTMLAttributes<HTMLImageElement> {
    size?: 'sm' | 'md' | 'lg' | 'full';
}

export default function AppLogoIcon({
    className = '',
    size = 'full',
}: AppLogoIconProps) {
    const { networkBranding } = usePage<SharedData>().props;

    const logoSrc = networkBranding?.sidebar_logo_url || '/logo.png';
    const altText = networkBranding?.network_name
        ? `${networkBranding.network_name} Logo`
        : 'App Logo';

    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-10 w-10',
        full: 'h-full w-full max-h-10 max-w-full',
    };

    return (
        <img
            src={logoSrc}
            alt={altText}
            className={`object-contain ${sizeClasses[size]} ${className}`}
        />
    );
}
