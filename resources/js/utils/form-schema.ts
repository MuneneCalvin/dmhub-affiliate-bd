import z from 'zod';

export const registerUserSchema = z
    .object({
        first_name: z.string().min(1, 'First name is required'),
        last_name: z.string().min(1, 'Last name is required'),
        email: z.string().min(1, 'Email Address is required'),
        password: z.string().min(1, 'Password is required'),
        password_confirmation: z.string().min(1, 'Confirm your Password'),
    })
    .refine((data) => data.password === data.password_confirmation, {
        path: ['password_confirmation'],
        message: 'Passwords do not match',
    });
export const networkSchema = z.object({
    network_name: z.string().min(1, 'Network name is required'),
    owner_email: z.string().email('Valid owner email is required'),
    default_currency: z.string().min(1, 'Default currency is required'),
    requires_prepaid_funding: z.boolean(),
    default_commission_model: z
        .string()
        .min(1, 'Default commission model is required'),
    default_commission_value: z
        .number()
        .nonnegative()
        .multipleOf(0.01)
        .or(z.string()),
    min_payment_threshold: z
        .number()
        .nonnegative()
        .multipleOf(0.01)
        .or(z.string()),
    payment_frequency: z.string().optional(),
    pay_day_of_month: z.number().int().min(1).max(31),
    pay_day_of_week: z.number().int().min(0).max(6),
    settings: z.any(),
    logo_url: z.string().url(),
    support_email: z.string().email('Support Email Address is required'),
    support_phone: z.string().max(15, 'Phone number too long'),
    country_iso: z.string().min(1, 'Country is required'),
});
export const advertiserSchema = z.object({
    id: z.number().optional(),
    business_name: z.string().min(1, 'Business name is required'),
    website_name: z
        .string()
        .min(1, 'Website is required')
        .url('Enter a valid website URL')
        .refine(
            (value) => /^https?:\/\//i.test(value),
            'Enter a valid website URL',
        ),
    industry: z.string().min(1, 'Industry is required'),
    coc_number: z
        .string()
        .min(6, 'Chamber of commerce no. must be at least 6 characters')
        .max(10, 'Chamber of commerce no. must not exceed 10 characters'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().min(1, 'Email Address is required'),
    network_id: z.string().optional(),
    total_budget: z.string().optional(),
    currency_code: z.string().optional(),
});

export const publisherSchema = z.object({
    id: z.number().optional(),
    business_name: z.string().min(1, 'Business name is required'),
    website_name: z
        .string()
        .min(1, 'Website is required')
        .url('Enter a valid website URL')
        .refine(
            (value) => /^https?:\/\//i.test(value),
            'Enter a valid website URL',
        ),
    industry: z.string().min(1, 'Industry is required'),
    coc_number: z
        .string()
        .min(6, 'Chamber of commerce no. must be at least 6 characters')
        .max(10, 'Chamber of commerce no. must not exceed 10 characters'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().min(1, 'Email Address is required'),
    network_id: z.string().optional(),
    total_budget: z.string().optional(),
    currency_code: z.string().optional(),
    title: z.string().optional(),
});

// Publishers sign up through their channels, so the website is not a field of its own.
export const publisherCompanySignupSchema = publisherSchema.extend({
    website_name: z.string().optional(),
});

// An individual has no company, industry or CoC number to give.
export const publisherIndividualSignupSchema = z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().min(1, 'Email Address is required'),
});

export const publisherSchemaEdit = z.object({
    id: z.number().optional(),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().min(1, 'Email Address is required'),
    network_id: z.string().optional(),
    total_budget: z.string().optional(),
    currency_code: z.string().optional(),
});

export const changeNetworkSchema = z.object({
    network_id: z.string().min(1, 'Network is required'),
});

export const networkUsersSchema = z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    title: z.string().min(1, 'Title is required'),
    email: z.string().email('Invalid email format'),

    network_id: z.number().min(1, 'Network is required'),
});

export const campaignSchema = z
    .object({
        name: z
            .string()
            .min(1, 'Campaign name is required')
            .max(200, 'Name must be less than 200 characters'),
        description: z.string().optional(),
        terms: z.array(z.string()).optional(),
        start_date: z.date({ error: 'Start date is required' }),
        end_date: z.date().optional(),
        no_end_date: z.boolean().optional(),
        total_budget: z
            .string()
            .regex(/^\d+(\.\d{1,2})?$/, 'Invalid budget format')
            .optional()
            .or(z.literal('')),
        daily_budget: z
            .string()
            .regex(/^\d+(\.\d{1,2})?$/, 'Invalid budget format')
            .optional()
            .or(z.literal('')),
        currency: z
            .string()
            .length(3, 'Currency must be 3 characters (e.g., USD)'),
        geo_targeting: z.array(z.string()).optional(),
        device_targeting: z.array(z.string()).optional(),
        max_publishers: z.string().optional(),
        target_conversions: z.string().optional(),
        target_roi: z
            .string()
            .regex(/^\d+(\.\d{1,2})?$/, 'Invalid ROI format')
            .optional()
            .or(z.literal('')),
        metadata: z.array(z.string()).optional(),
    })
    .refine(
        (data) => {
            if (data.no_end_date) return true;
            if (!data.end_date) return false;
            return data.end_date > data.start_date;
        },
        {
            message: 'End date must be after start date',
            path: ['end_date'],
        },
    )
    .refine(
        (data) => {
            return data.no_end_date || data.end_date;
        },
        {
            message:
                'End date is required unless "Never ending campaign" is selected',
            path: ['end_date'],
        },
    );

export const offersSchema = z.object({
    name: z
        .string()
        .min(1, 'Offer name is required')
        .max(200, 'Name must be less than 200 characters'),
    description: z.string().optional(),
    terms: z.array(z.string()).optional(),
    offer_status: z.enum(['A', 'I', 'P']).optional(),
    commission_type_1: z.string().optional(),
    commission_value_1: z.string().min(1, 'Commission value 1 is required'),
    commission_type_2: z.string().optional(),
    commission_value_2: z.string().optional(),
    bonus: z.array(z.string()).optional(),
    conversion_window_hours: z.string().optional(),
    click_cookie_lifetime_hours: z.string().optional(),
    minimum_payout: z.string().optional(),
    allowed_traffic_sources: z.array(z.string()).optional(),
    prohibited_traffic_sources: z.array(z.string()).optional(),
    preview_url: z.string().url().optional().or(z.literal('')),
    thumbnail: z
        .custom<File>(
            (value) => typeof File !== 'undefined' && value instanceof File,
        )
        .refine(
            (file) =>
                ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
                    file.type,
                ) && file.size <= 10 * 1024 * 1024,
            'Choose a JPG, PNG, GIF or WebP image up to 10 MB.',
        )
        .nullable()
        .optional(),
});

export const commissionnSchema = z.object({
    name: z.string().min(1, 'Name is required'),
});

export const campaignApplicationSchema = z.object({
    applied_notes: z.string().min(1, 'Application note is required'),
    files: z.array(z.instanceof(File)).optional().default([]),
});

export const campaignTermsSchema = z.object({
    description: z.string().min(1, 'Description is required'),
});
