// Local-only design-system gallery (route /dev/ui, registered when APP_ENV=local).
// Visual QA only: copy here is fixed sample text and is not translated.
import {
    CopyField,
    EmptyState,
    FilterChips,
    IconTile,
    IdentityCell,
    MetricTile,
    ProgressBar,
    ProgressRing,
    SectionCard,
    StatCard,
    Stepper,
    TrendChip,
} from '@/components/app';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { domainTones } from '@/lib/tones';
import { Head } from '@inertiajs/react';
import {
    FileText,
    LayoutGrid,
    LogOut,
    Megaphone,
    MoreHorizontal,
    Plus,
    Trash2,
    User,
    Users,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const statuses = [
    'active',
    'pending',
    'rejected',
    'draft',
    'archived',
    'not_applied',
    'unknown_status',
];

export default function UiGallery() {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains('dark'),
    );
    const [segment, setSegment] = useState('all');
    const [currency, setCurrency] = useState('EUR');
    const [chips, setChips] = useState<string[]>(['active']);
    const [model, setModel] = useState('cpa');

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark', !dark);
        setDark(!dark);
    };

    return (
        <div className="min-h-screen bg-canvas text-ink">
            <Head title="UI gallery" />
            <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 py-8 sm:px-9">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">
                        UI gallery
                    </h1>
                    <Button variant="secondary" onClick={toggleTheme}>
                        {dark ? 'Light theme' : 'Dark theme'}
                    </Button>
                </header>

                <SectionCard
                    title="Buttons"
                    icon={<Megaphone />}
                    description="44px controls, 12px radius."
                >
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button>
                            <Plus /> Primary
                        </Button>
                        <Button variant="secondary">Secondary</Button>
                        {domainTones.map((tone) => (
                            <Button key={tone} variant="soft" tone={tone}>
                                Soft {tone}
                            </Button>
                        ))}
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="destructive">
                            <Trash2 /> Delete
                        </Button>
                        <Button variant="success">Save payment</Button>
                        <Button size="sm">Small</Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            aria-label="More actions"
                        >
                            <MoreHorizontal />
                        </Button>
                        <Button disabled>Disabled</Button>
                    </div>
                </SectionCard>

                <div className="grid gap-[18px] md:grid-cols-2">
                    <SectionCard
                        title="Status & chips"
                        icon={<LayoutGrid />}
                        tone="analytics"
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap gap-2">
                                {statuses.map((s) => (
                                    <StatusBadge key={s} status={s} />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <TrendChip value={12.4} />
                                <TrendChip value={-2.3} />
                                <TrendChip value={0} />
                                <Badge variant="count">12</Badge>
                            </div>
                            <FilterChips
                                label="Status filter"
                                value={chips}
                                onValueChange={setChips}
                                options={[
                                    {
                                        value: 'active',
                                        label: 'Active',
                                        tone: 'success',
                                        count: 39,
                                    },
                                    {
                                        value: 'paused',
                                        label: 'Paused',
                                        tone: 'warning',
                                        count: 3,
                                    },
                                    {
                                        value: 'ended',
                                        label: 'Ended',
                                        tone: 'neutral',
                                        count: 6,
                                    },
                                ]}
                            />
                            <SegmentedControl
                                label="Segment"
                                value={segment}
                                onValueChange={setSegment}
                                options={[
                                    { value: 'all', label: 'All', count: 48 },
                                    {
                                        value: 'active',
                                        label: 'Active',
                                        count: 39,
                                    },
                                    {
                                        value: 'pending',
                                        label: 'Pending',
                                        count: 6,
                                    },
                                ]}
                            />
                            <SegmentedControl
                                label="Currency"
                                variant="filled"
                                tone="finance"
                                value={currency}
                                onValueChange={setCurrency}
                                options={[
                                    { value: 'EUR', label: 'EUR' },
                                    { value: 'USD', label: 'USD' },
                                    { value: 'GBP', label: 'GBP' },
                                ]}
                            />
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Inputs"
                        icon={<FileText />}
                        tone="admin"
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="g-name">Campaign name</Label>
                                <Input
                                    id="g-name"
                                    defaultValue="Summer Sale 2026"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="g-amount">Payout amount</Label>
                                <InputGroup leading="€">
                                    <Input id="g-amount" defaultValue="12.00" />
                                </InputGroup>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="g-type">
                                        Commission type
                                    </Label>
                                    <Select defaultValue="cpa">
                                        <SelectTrigger id="g-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cpa">
                                                CPA · per sale
                                            </SelectItem>
                                            <SelectItem value="cpl">
                                                CPL · per lead
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="g-web">Website</Label>
                                    <Input
                                        id="g-web"
                                        defaultValue="brightside"
                                        aria-invalid
                                    />
                                    <span className="text-xs font-semibold text-danger-ink">
                                        Enter a full URL, e.g. https://…
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-6">
                                <label className="flex min-h-11 items-center gap-2.5">
                                    <Checkbox defaultChecked /> Auto-approve
                                </label>
                                <label className="flex min-h-11 items-center gap-2.5">
                                    <Switch defaultChecked tone="partners" />{' '}
                                    Deep linking
                                </label>
                            </div>
                            <RadioCardGroup
                                name="g-model"
                                label="Model"
                                value={model}
                                onValueChange={setModel}
                            >
                                <RadioCard
                                    value="cpa"
                                    title="CPA"
                                    hint="Per sale"
                                    tone="finance"
                                />
                                <RadioCard
                                    value="cpl"
                                    title="CPL"
                                    hint="Per lead"
                                    tone="finance"
                                />
                            </RadioCardGroup>
                        </div>
                    </SectionCard>
                </div>

                <div className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Revenue"
                        value="€48,210.00"
                        icon={<Wallet />}
                        tone="finance"
                        trend={12.4}
                        sparkline={[3, 4, 3, 6, 5, 8, 9]}
                    />
                    <StatCard
                        label="Publishers"
                        value="128"
                        icon={<Users />}
                        tone="partners"
                        trend={-2.3}
                    />
                    <StatCard
                        label="Budget"
                        value="€6,200"
                        icon={<Wallet />}
                        tone="brand"
                        progress={{
                            value: 62,
                            label: 'Budget spent',
                            caption: '62% of €10,000',
                        }}
                    />
                    <StatCard
                        label="Users"
                        value="1,204"
                        icon={<User />}
                        tone="admin"
                        variant="solid"
                        trend={4}
                    />
                </div>

                <div className="grid gap-[18px] md:grid-cols-3">
                    <SectionCard
                        title="Metrics"
                        icon={<Wallet />}
                        tone="finance"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <MetricTile
                                label="Paid"
                                value="€2,140"
                                tone="finance"
                            />
                            <MetricTile
                                label="Clicks"
                                value="9,210"
                                tone="analytics"
                            />
                        </div>
                        <ProgressBar
                            className="mt-4"
                            label="Budget"
                            value={72}
                            tone="finance"
                            caption="72% spent"
                        />
                        <div className="mt-4 flex justify-center">
                            <ProgressRing
                                label="Approval"
                                value={75}
                                tone="partners"
                            />
                        </div>
                    </SectionCard>
                    <SectionCard title="Wizard" icon={<LayoutGrid />}>
                        <Stepper
                            label="Campaign steps"
                            current={1}
                            onStepSelect={() => {}}
                            steps={[
                                {
                                    id: 'a',
                                    title: 'Basics',
                                    description: 'Name and dates',
                                },
                                {
                                    id: 'b',
                                    title: 'Budget',
                                    description: 'Funding and caps',
                                },
                                {
                                    id: 'c',
                                    title: 'Review',
                                    description: 'Check and publish',
                                },
                            ]}
                        />
                    </SectionCard>
                    <SectionCard title="Empty" icon={<Megaphone />}>
                        <EmptyState
                            icon={<Megaphone />}
                            title="No campaigns yet"
                            description="Empty states get a tile, one sentence and one action."
                            action={
                                <Button variant="soft">Create campaign</Button>
                            }
                        />
                    </SectionCard>
                </div>

                <SectionCard
                    title="Table & tabs"
                    icon={<Users />}
                    tone="partners"
                    flush
                >
                    <Tabs defaultValue="overview" className="px-[22px]">
                        <TabsList aria-label="Example tabs">
                            <TabsTrigger value="overview" icon={<LayoutGrid />}>
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="offers" count={6}>
                                Offers
                            </TabsTrigger>
                            <TabsTrigger value="publishers">
                                Publishers
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" />
                    </Tabs>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Partner</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Revenue
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {['CouponLab', 'Brightside Media', 'Voltix'].map(
                                (name, i) => (
                                    <TableRow key={name}>
                                        <TableCell>
                                            <IdentityCell
                                                name={name}
                                                subtitle={`hello@${name.toLowerCase().replace(/\s/g, '')}.test`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={
                                                    [
                                                        'active',
                                                        'pending',
                                                        'suspended',
                                                    ][i]
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            €{(i + 1) * 1240}.00
                                        </TableCell>
                                    </TableRow>
                                ),
                            )}
                        </TableBody>
                    </Table>
                </SectionCard>

                <SectionCard title="Overlays" icon={<FileText />} tone="admin">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary">Open dialog</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader icon={<Wallet />} tone="finance">
                                    <DialogTitle>Record payment</DialogTitle>
                                    <DialogDescription>
                                        INV-2051 · Brightside Media
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="g-paid">Amount paid</Label>
                                    <InputGroup leading="€">
                                        <Input
                                            id="g-paid"
                                            defaultValue="2,140.01"
                                        />
                                    </InputGroup>
                                </div>
                                <DialogFooter>
                                    <Button variant="secondary">Cancel</Button>
                                    <Button variant="success">
                                        Save payment
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    Confirm dialog
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader icon={<Trash2 />}>
                                    <AlertDialogTitle>
                                        Delete “Finance reviewer”?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        6 users lose these permissions straight
                                        away. This can't be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction variant="destructive">
                                        Delete role
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary">
                                    Account menu
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem icon={<User />}>
                                    Account settings
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    icon={<FileText />}
                                    tone="partners"
                                >
                                    Campaign terms
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    icon={<LogOut />}
                                    variant="destructive"
                                >
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            variant="soft"
                            onClick={() =>
                                toast.success('Payment recorded', {
                                    description: 'INV-2051 is now marked paid.',
                                    action: {
                                        label: 'Undo',
                                        onClick: () => {},
                                    },
                                })
                            }
                        >
                            Success toast
                        </Button>
                        <Button
                            variant="soft"
                            tone="admin"
                            onClick={() =>
                                toast.error("Couldn't save offer", {
                                    description:
                                        'Payout must be greater than zero.',
                                })
                            }
                        >
                            Error toast
                        </Button>
                        <Button
                            variant="soft"
                            tone="analytics"
                            onClick={() => toast.info('Tracking link copied')}
                        >
                            Info toast
                        </Button>
                    </div>
                    <CopyField
                        className="mt-4"
                        label="Tracking link"
                        value="https://track.example.test/c/8f2a91"
                    />
                    <div className="mt-4 flex flex-wrap gap-3">
                        {domainTones.map((tone) => (
                            <IconTile key={tone} tone={tone} size={56}>
                                <Megaphone />
                            </IconTile>
                        ))}
                        {domainTones.map((tone) => (
                            <IconTile key={tone} tone={tone} variant="solid">
                                <Megaphone />
                            </IconTile>
                        ))}
                    </div>
                </SectionCard>
            </main>
        </div>
    );
}
