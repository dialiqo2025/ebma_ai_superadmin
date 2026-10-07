import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-[11px] min-h-[42px] px-[18px] text-[13px] font-bold cursor-pointer transition duration-[250ms] whitespace-nowrap hover:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0";

const variants = {
  primary:
    "border-0 text-on-brand bg-brand-gradient shadow-[0_9px_28px_rgba(91,79,233,.25),inset_0_1px_rgba(255,255,255,.15)] hover:shadow-[0_12px_34px_rgba(91,79,233,.4),inset_0_1px_rgba(255,255,255,.2)]",
  outline: "border border-border bg-surface",
  ghost: "border border-border bg-transparent",
  quiet:
    "border border-border bg-surface-raised text-text",
  light: "border-0 bg-white text-accent",
  glass:
    "border border-border bg-surface-raised text-text",
} as const;

type Variant = keyof typeof variants;

type ButtonProps = {
  variant?: Variant;
  large?: boolean;
  className?: string;
  children: ReactNode;
} & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "className" | "children">)
  | ({ href?: undefined } & ComponentProps<"button">)
);

export function Button({
  variant = "primary",
  large,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cx(
    base,
    variants[variant],
    large && "min-h-[52px] px-6 rounded-[14px] text-sm",
    className,
  );

  if ("href" in props && props.href !== undefined) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as ComponentProps<"button">;
  return (
    <button type={buttonProps.type ?? "button"} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block h-[18px] w-[18px] rounded-full border-2 border-border border-t-brand animate-[spin_.7s_linear_infinite]",
        className,
      )}
    />
  );
}
