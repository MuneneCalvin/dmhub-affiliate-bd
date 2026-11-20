import { renderWithApp } from '@/test/render';
import { screen, waitFor } from '@testing-library/react';
import { Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

describe('Dialog', () => {
    it('has an icon header, a named 44px close button and a muted footer', async () => {
        const { user } = renderWithApp(
            <Dialog open onOpenChange={() => {}}>
                <DialogContent>
                    <DialogHeader icon={<Wallet />} tone="finance">
                        <DialogTitle>Record payment</DialogTitle>
                        <DialogDescription>INV-1</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button type="button">Save payment</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>,
        );
        const dialog = screen.getByRole('dialog', { name: 'Record payment' });
        expect(dialog).toHaveClass('rounded-[24px]');
        expect(
            dialog.querySelector('[data-slot="icon-tile"]'),
        ).toHaveAttribute('data-tone', 'finance');
        const close = screen.getByRole('button', { name: 'Close' });
        expect(close).toHaveClass('size-11');
        expect(
            screen.getByRole('button', { name: 'Save payment' }).parentElement,
        ).toHaveClass('bg-surface-muted');
        await user.click(close);
    });
});

describe('AlertDialog', () => {
    it('is a centred alertdialog with a 64px danger tile', () => {
        renderWithApp(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogHeader icon={<Trash2 />}>
                        <AlertDialogTitle>Delete role?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This can't be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive">
                            Delete role
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>,
        );
        const dialog = screen.getByRole('alertdialog', { name: 'Delete role?' });
        const tile = dialog.querySelector('[data-slot="icon-tile"]');
        expect(tile).toHaveAttribute('data-tone', 'danger');
        expect(tile).toHaveClass('size-16');
        expect(screen.getByRole('button', { name: 'Delete role' })).toHaveClass(
            'bg-danger-strong',
        );
    });
});

describe('Sheet', () => {
    it('reuses the overlay close button', () => {
        renderWithApp(
            <Sheet open>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Application</SheetTitle>
                    </SheetHeader>
                </SheetContent>
            </Sheet>,
        );
        expect(screen.getByRole('dialog', { name: 'Application' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('size-11');
    });
});

describe('DropdownMenu', () => {
    it('renders 44px items with soft icon tiles', async () => {
        const { user } = renderWithApp(
            <DropdownMenu>
                <DropdownMenuTrigger>Account menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem icon={<Wallet />}>Settings</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" icon={<Trash2 />}>
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>,
        );
        await user.click(screen.getByRole('button', { name: 'Account menu' }));
        const item = screen.getByRole('menuitem', { name: 'Settings' });
        expect(item).toHaveClass('min-h-11');
        expect(
            screen.getByRole('menuitem', { name: 'Log out' }).firstElementChild,
        ).toHaveClass('bg-danger-soft');
    });
});

describe('DropdownMenu asChild', () => {
    it('keeps a single child for asChild items, with and without a tile', async () => {
        const { user } = renderWithApp(
            <DropdownMenu>
                <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                        <a href="/settings">Settings</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild icon={<Wallet />}>
                        <a href="/logout">Log out</a>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>,
        );
        await user.click(screen.getByRole('button', { name: 'Menu' }));
        expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute(
            'href',
            '/settings',
        );
        const logout = screen.getByRole('menuitem', { name: 'Log out' });
        expect(logout.tagName).toBe('A');
        expect(logout.querySelector('svg')).not.toBeNull();
    });
});

describe('Card and Table', () => {
    it('card has the 18px radius and card shadow', () => {
        renderWithApp(
            <Card data-testid="card">
                <CardHeader>
                    <CardTitle>Pending</CardTitle>
                </CardHeader>
                <CardContent>Body</CardContent>
            </Card>,
        );
        expect(screen.getByTestId('card')).toHaveClass('rounded-card', 'shadow-card');
    });

    it('table scrolls horizontally with uppercase heads', () => {
        renderWithApp(
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>Active</TableCell>
                    </TableRow>
                </TableBody>
            </Table>,
        );
        expect(screen.getByRole('columnheader', { name: 'Status' })).toHaveClass(
            'uppercase',
            'bg-surface-muted',
        );
        expect(screen.getByRole('table').parentElement).toHaveClass('overflow-x-auto');
    });
});

describe('overlay focus return', () => {
    function StateOpened({ kind }: { kind: 'dialog' | 'sheet' }) {
        const [open, setOpen] = useState(false);
        return (
            <>
                <button type="button" onClick={() => setOpen(true)}>
                    Open {kind}
                </button>
                {kind === 'dialog' ? (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogContent>
                            <DialogTitle>Edit</DialogTitle>
                            <DialogDescription>Body</DialogDescription>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Details</SheetTitle>
                            </SheetHeader>
                        </SheetContent>
                    </Sheet>
                )}
            </>
        );
    }

    it.each(['dialog', 'sheet'] as const)(
        'returns focus to the opener of a %s without a trigger',
        async (kind) => {
            const { user } = renderWithApp(<StateOpened kind={kind} />);
            const opener = screen.getByRole('button', { name: `Open ${kind}` });
            await user.click(opener);
            expect(await screen.findByRole('dialog')).toBeInTheDocument();
            await user.keyboard('{Escape}');
            await waitFor(() => expect(opener).toHaveFocus());
        },
    );
});
