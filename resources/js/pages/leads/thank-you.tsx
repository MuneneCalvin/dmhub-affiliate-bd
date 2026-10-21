/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ThankYouPageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

const ThankYouPage = () => {
    const { redirect_url } = usePage<ThankYouPageProps>().props;

    useEffect(() => {
        if (redirect_url && redirect_url !== '/lead/thank-you') {
            const timer = setTimeout(() => {
                window.location.href = redirect_url;
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [redirect_url]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4 dark:from-gray-900 dark:to-gray-800">
            <Head title="Thank You" />

            <Card className="w-full max-w-md text-center shadow-xl">
                <CardHeader>
                    <div className="mb-4 flex justify-center">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400">
                        Thank You!
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Your submission has been received successfully.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        We appreciate your interest and will be in touch with
                        you shortly.
                    </p>

                    {redirect_url && redirect_url !== '/lead/thank-you' && (
                        <p className="text-sm text-gray-500">
                            You will be redirected in a few seconds...
                        </p>
                    )}

                    <Button
                        variant="outline"
                        onClick={() => window.close()}
                        className="mt-4"
                    >
                        Close Window
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default ThankYouPage;
