import { cn } from "@/lib/utils";

interface ChipProps {
  name: string;
  nickname?: string;
  color?: string;
  avatarUrl?: string;
  size?: "sm" | "md";
  className?: string;
}

export function Chip({
  name,
  nickname,
  color = "#FFD800",
  avatarUrl,
  size = "md",
  className,
}: ChipProps) {
  const display = nickname ?? name;
  const initial = display.charAt(0).toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border-2 border-coo-black font-dm font-semibold leading-none",
        size === "sm"
          ? "text-xs px-2 py-1 rounded-full"
          : "text-sm px-2.5 py-1.5 rounded-full",
        className
      )}
      style={{ boxShadow: "2px 2px 0 #0A0A0A" }}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={display}
          className={cn(
            "rounded-full object-cover shrink-0 border border-coo-black",
            size === "sm" ? "w-4 h-4" : "w-5 h-5"
          )}
        />
      ) : (
        <span
          className={cn(
            "rounded-full flex items-center justify-center shrink-0 font-archivo text-coo-black border border-coo-black",
            size === "sm" ? "w-4 h-4 text-[9px]" : "w-5 h-5 text-[10px]"
          )}
          style={{ backgroundColor: color }}
        >
          {initial}
        </span>
      )}
      {display}
    </span>
  );
}
