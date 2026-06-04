import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./utils.js";

export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  default: "border-slate-900 bg-white text-slate-950 hover:bg-slate-100",
  destructive: "border-red-900 bg-red-600 text-white hover:bg-red-700",
  outline: "border-slate-900 bg-transparent hover:bg-slate-100",
  secondary: "border-slate-700 bg-slate-100 text-slate-950 hover:bg-slate-200",
  ghost: "border-transparent bg-transparent hover:bg-slate-100",
  link: "border-transparent bg-transparent text-blue-700 underline-offset-4 hover:underline",
};

const sizeClass: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-8",
  icon: "size-10",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
