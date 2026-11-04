import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/format";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-marker text-ink hover:bg-marker-strong",
        dark: "bg-ink text-white hover:bg-navy-700",
        outline: "border border-line-strong bg-paper text-ink hover:bg-surface",
        ghost: "text-ink-soft hover:bg-surface hover:text-ink",
        danger: "bg-danger text-white hover:bg-[#9c2f23]",
        "danger-outline": "border border-danger/40 bg-paper text-danger hover:bg-danger-soft",
        ok: "bg-ok text-white hover:bg-[#186a46]",
        link: "h-auto px-0 text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink",
      },
      size: {
        sm: "h-8 rounded-[7px] px-3 text-[13px]",
        md: "h-10 rounded-ctl px-4 text-sm",
        lg: "h-12 rounded-ctl px-6 text-base",
        icon: "size-9 rounded-ctl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
