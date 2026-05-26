"use client";

import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const navButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "absolute top-0 size-7 bg-transparent p-0 opacity-80 hover:opacity-100 disabled:opacity-40"
);

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      locale={ko}
      showOutsideDays={showOutsideDays}
      navLayout="around"
      className={cn("p-3 select-none", className)}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex flex-col gap-4", defaultClassNames.months),
        month: cn("relative flex w-full flex-col gap-3", defaultClassNames.month),
        month_caption: cn(
          "flex h-7 items-center justify-center px-7",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "text-sm font-medium text-midnight-charcoal",
          defaultClassNames.caption_label
        ),
        nav: cn("hidden", defaultClassNames.nav),
        button_previous: cn(navButtonClass, "left-0", defaultClassNames.button_previous),
        button_next: cn(navButtonClass, "right-0", defaultClassNames.button_next),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: defaultClassNames.weekdays,
        weekday: cn(
          "h-9 w-9 p-0 text-center text-[0.8rem] font-normal text-muted-foreground",
          defaultClassNames.weekday
        ),
        week: defaultClassNames.week,
        day: cn(
          "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          defaultClassNames.day
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal",
          defaultClassNames.day_button
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-50",
        disabled: "[&>button]:text-muted-foreground [&>button]:opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground [&>button]:bg-transparent",
        range_start:
          "[&>button]:rounded-l-md [&>button]:bg-primary [&>button]:text-primary-foreground",
        range_end:
          "[&>button]:rounded-r-md [&>button]:bg-primary [&>button]:text-primary-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
