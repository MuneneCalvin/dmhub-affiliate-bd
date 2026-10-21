import AuthLayout from '@/layouts/auth-layout';
import { ReusableTabComponent } from '@/dev/core';
import { EREGISTER_TYPE } from '@/utils/enums';
import { RegisterTabs } from '@/dev/tabs';
import { Head } from '@inertiajs/react';
import { useLanguage } from '@/context/language-context';

export default function Register() {
    const { __ } = useLanguage();
    return (
        <AuthLayout
            title={__('Create an account')}
            description={__('Enter your details below to create your account')}>
            <Head title={__('Register')} />
            <div className="flex w-full justify-center">
                <div className="group relative w-full flex flex-col gap-3">
                    <ReusableTabComponent
                        {...{
                            defaultTab: EREGISTER_TYPE.PUBLISHER,
                            tabs: RegisterTabs,
                            tabProps: {},
                        }}
                    />
                </div>
            </div>
        </AuthLayout>
    );
}
