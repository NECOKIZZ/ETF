import Link from "next/link";

type Variant = "primary" | "mint" | "ghost" | "text";

const styles: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:opacity-90",
  mint: "bg-up-bg text-up hover:brightness-95",
  ghost: "border border-line bg-bg text-ink hover:bg-surface",
  text: "text-ink hover:opacity-70",
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
  onClick,
  disabled,
  type = "button",
}: {
  href?: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const pad = variant === "text" ? "" : size === "lg" ? "px-6" : size === "sm" ? "px-4" : "px-5";
  const sz = `${size === "lg" ? "h-12 text-[16px]" : size === "sm" ? "h-9 text-[13px]" : "h-11 text-[15px]"} ${pad}`;
  const cls = `inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition duration-200 ease-soft disabled:cursor-not-allowed disabled:opacity-40 ${sz} ${styles[variant]} ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    // eslint-disable-next-line react/button-has-type
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
