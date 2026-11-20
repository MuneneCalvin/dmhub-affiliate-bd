'use client';

import { Search as SearchIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useTranslate } from '@/context/language-context';
import { useIsMobile } from '@/hooks/use-mobile';

export function Search() {
    const isDesktop = !useIsMobile();
    const { t } = useTranslate();
    const [open, setOpen] = React.useState(false);
    if (isDesktop) {
        return (
            <div className="relative flex items-center">
                <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search..."
                    className="h-9 w-[200px] bg-muted/50 pl-9 transition-all focus:bg-background lg:w-[300px]"
                />
            </div>
        );
    }
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <SearchIcon className="h-5 w-5" />
                    <span className="sr-only">{t('Search')}</span>
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>Search</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pt-2 pb-8">
                    <div className="relative">
                        <SearchIcon className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            type="search"
                            placeholder="Type to search..."
                            className="h-10 w-full pl-9"
                            onKeyDown={(e) =>
                                e.key === 'Enter' && setOpen(false)
                            }
                        />
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
