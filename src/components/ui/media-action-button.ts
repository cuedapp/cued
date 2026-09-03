import { cva } from "class-variance-authority";

export const mediaActionButtonVariants = cva(
  "inline-grid h-10 min-w-10 w-full cursor-pointer place-items-center rounded-none border-0 p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[disabled]:cursor-default data-[disabled]:opacity-70",
  {
    variants: {
      intent: {
        default: "bg-transparent text-muted-foreground hover:bg-accent hover:text-primary",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
      },
    },
    defaultVariants: { intent: "default" },
  },
);
