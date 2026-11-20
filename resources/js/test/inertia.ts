// Test double for @inertiajs/react, installed by setup.ts. Components read page
// props through usePage(); tests set them with setPageProps().
import {
    createElement,
    type AnchorHTMLAttributes,
    type FormHTMLAttributes,
    type ReactNode,
} from 'react';
import { vi } from 'vitest';

type Props = Record<string, unknown>;

export const defaultPageProps: Props = {
    auth: {
        user: {
            id: 1,
            first_name: 'Test',
            last_name: 'User',
            email: 'test.user@example.test',
            is_super_admin: false,
        },
        permissions: [],
        roles: [],
    },
    locale: { current: 'en', available: ['en', 'nl'] },
    flash: {},
    errors: {},
};

let pageProps: Props = { ...defaultPageProps };
let pageUrl = '/dashboard';

export function setPageProps(props: Props, url = pageUrl) {
    pageProps = { ...defaultPageProps, ...props };
    pageUrl = url;
}

export function resetPage() {
    formErrors = {};
    pageProps = { ...defaultPageProps };
    pageUrl = '/dashboard';
}

export const router = {
    visit: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    reload: vi.fn(),
    on: vi.fn(() => () => {}),
};

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href?: string | { url: string };
    method?: string;
    as?: string;
    prefetch?: boolean;
    preserveScroll?: boolean;
    preserveState?: boolean;
    children?: ReactNode;
};

export function Link({
    href,
    method,
    as,
    prefetch,
    preserveScroll,
    preserveState,
    ...rest
}: LinkProps) {
    void method;
    void prefetch;
    void preserveScroll;
    void preserveState;
    const url = typeof href === 'string' ? href : href?.url;
    return createElement(as === 'button' ? 'button' : 'a', {
        href: url,
        ...rest,
    });
}

export function Head({ children }: { children?: ReactNode }) {
    return createElement('div', { 'data-testid': 'inertia-head' }, children);
}

export function usePage() {
    return { props: pageProps, url: pageUrl, component: 'test', version: null };
}

export function useForm<T extends Props>(initial: T) {
    let data = { ...initial };
    return {
        data,
        setData: vi.fn((key: keyof T | T, value?: unknown) => {
            data =
                typeof key === 'object'
                    ? { ...data, ...key }
                    : { ...data, [key]: value };
        }),
        errors: {} as Record<string, string>,
        processing: false,
        reset: vi.fn(),
        clearErrors: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        submit: vi.fn(),
    };
}

type FormSlot = {
    errors: Record<string, string>;
    processing: boolean;
    clearErrors: () => void;
    hasErrors: boolean;
};

/** `<Form>` double: a plain form whose render-prop gets idle state. */
export function Form({
    children,
    action,
    method,
    transform,
    resetOnSuccess,
    resetOnError,
    ...rest
}: Omit<FormHTMLAttributes<HTMLFormElement>, 'children' | 'action'> & {
    action?: string | { url: string };
    method?: string;
    transform?: unknown;
    resetOnSuccess?: unknown;
    resetOnError?: unknown;
    children?: ReactNode | ((slot: FormSlot) => ReactNode);
}) {
    void transform;
    void resetOnSuccess;
    void resetOnError;
    const slot: FormSlot = {
        errors: formErrors,
        processing: false,
        clearErrors: vi.fn(),
        hasErrors: Object.keys(formErrors).length > 0,
    };
    return createElement(
        'form',
        {
            action: typeof action === 'string' ? action : action?.url,
            method,
            onSubmit: (event: Event) => event.preventDefault(),
            ...rest,
        },
        typeof children === 'function' ? children(slot) : children,
    );
}

let formErrors: Record<string, string> = {};

/** Errors the next rendered `<Form>` passes to its children. */
export function setFormErrors(errors: Record<string, string>) {
    formErrors = errors;
}
