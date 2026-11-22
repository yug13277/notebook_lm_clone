import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Apple Button — pill-shaped CTAs, blue primary, f5f5f7 secondary
// Primary: #0071e3 blue, 980px radius (fully pill), 17px font, 400 weight
// Secondary: #f5f5f7 off-white bg, dark text
// Transition: 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-[1.0625rem] font-normal leading-[1.17648] tracking-[-0.022em]",
    "rounded-[61.25rem] transition-[background-color,transform,box-shadow] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground " +
          "hover:brightness-110 hover:shadow-[0_8px_22px_rgb(0_0_0_/_20%)]",
        secondary:
          "bg-elevated text-text " +
          "hover:bg-secondary",
        outline:
          "bg-transparent text-primary " +
          "border border-primary/30 " +
          "hover:border-primary/60",
        ghost:
          "bg-transparent text-primary " +
          "hover:bg-elevated",
        destructive:
          "bg-destructive text-destructive-foreground " +
          "hover:bg-destructive/90",
        link: "text-primary text-[1.0625rem] underline-offset-4 hover:underline font-normal",
      },
      size: {
        sm:      "text-[0.875rem] h-8 px-[0.875rem]",
        default: "h-[2.75rem] px-[1.375rem]",
        lg:      "text-[1.1875rem] h-[3.25rem] px-[1.75rem]",
        icon:    "h-[2.75rem] w-[2.75rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<ButtonPrimitive.Props, "className">,
    VariantProps<typeof buttonVariants> {
  className?: string;
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Callers written against the Radix API pass the element to become as a
    // child: <Button asChild><Link>…</Link></Button>. Base UI has no asChild,
    // it composes through `render`. Without this the prop reaches the DOM and
    // the anchor nests inside the button instead of replacing it, which stacks
    // the icon above the label and puts a link inside a button.
    if (asChild && React.isValidElement(props.children)) {
      const { children, ...rest } = props
      return (
        <ButtonPrimitive
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          {...rest}
          nativeButton={false}
          // After the spread, so an explicit asChild child wins over a stray
          // render prop rather than being silently replaced by it.
          // SAFETY: this branch runs only when `asChild` is set, and the caller then
          // owns passing a single element for the slot to clone.
          render={children as React.ReactElement}
        />
      );
    }

    return (
      <ButtonPrimitive
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
