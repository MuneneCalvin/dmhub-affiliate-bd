"use client"

import * as React from "react"
import { Search as SearchIcon } from "lucide-react"
// import { useMediaQuery } from "@/hooks/use-media-query"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useTranslate } from "@/context/language-context"
import { useMediaQuery } from "@/hooks/use-media-query"

export function Search() {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const {t} = useTranslate();
  const [open, setOpen] = React.useState(false)
  if (isDesktop) {
    return (
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search..."
          className="h-9 w-[200px] lg:w-[300px] pl-9 bg-muted/50 focus:bg-background transition-all"
        />
      </div>
    )
  }
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <SearchIcon className="h-5 w-5" />
          <span className="sr-only">{t("Search")}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Search</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 pt-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              type="search"
              placeholder="Type to search..."
              className="h-10 pl-9 w-full"
              onKeyDown={(e) => e.key === "Enter" && setOpen(false)}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}