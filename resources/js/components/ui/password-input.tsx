import { Eye, EyeOff, Lock } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Input, InputGroup } from '@/components/ui/input';

type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
    /** Show the lock icon before the field (default true). */
    showIcon?: boolean;
    groupClassName?: string;
};

/** Password field with a leading lock icon and a show/hide toggle button. */
function PasswordInput({
    showIcon = true,
    groupClassName,
    ...props
}: PasswordInputProps) {
    const { t } = useTranslation();
    const [visible, setVisible] = React.useState(false);

    return (
        <InputGroup
            className={groupClassName}
            leading={
                showIcon ? (
                    <Lock className="text-admin" aria-hidden="true" />
                ) : undefined
            }
            trailing={
                <button
                    type="button"
                    className="-mr-2 flex size-10 cursor-pointer items-center justify-center rounded-[10px] text-ink-muted hover:bg-surface-tint hover:text-ink"
                    aria-label={
                        visible ? t('Hide password') : t('Show password')
                    }
                    aria-pressed={visible}
                    onClick={() => setVisible((value) => !value)}
                >
                    {visible ? (
                        <EyeOff aria-hidden="true" />
                    ) : (
                        <Eye aria-hidden="true" />
                    )}
                </button>
            }
        >
            <Input type={visible ? 'text' : 'password'} {...props} />
        </InputGroup>
    );
}

export { PasswordInput };
