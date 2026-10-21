/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { ReusableTextInput } from "@/dev/core";
import { cn } from "@/lib/utils";
import advertiser from "@/routes/advertiser";
import { CommissionFormValuesTypes } from "@/types/schema_types";
import { commissionnSchema } from "@/utils/form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "@inertiajs/react";
import { Controller, useForm } from "react-hook-form";

const CreateCommission = ({
    componentProps,
    handleDialogContextSwitch
}: {
    handleDialogContextSwitch: any,
    componentProps?: any;
}) => {    
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<CommissionFormValuesTypes>({
        resolver: zodResolver(commissionnSchema),
        defaultValues: {
            name: '',
        },
    });

    const onSubmit = (values: CommissionFormValuesTypes) => {
        router.post(advertiser.commissions.create(), {
            ...values,
            id: componentProps?.id,
        });

        handleDialogContextSwitch?.({ state: false })
    };

    return (
        <div>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Create Commission</h3>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <ReusableTextInput
                                id="name"
                                label="Commission Name"
                                required
                                placeholder="Enter commission name"
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.name?.message}
                            />
                        )}
                    />
                </div>

                <div className="col-span-2 flex gap-4 justify-between mt-2">
                    <Button
                        type="button"
                        className={cn('bg-destructive')}
                        onClick={() =>
                            handleDialogContextSwitch?.({ state: false })
                        }>
                        Cancel
                    </Button>
                    <Button
                        type="submit" className={cn('bg-primary')}>
                        Create Commission
                    </Button>
                </div>
            </form>
        </div>
    );
};
export default CreateCommission;