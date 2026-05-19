import { type CardRarity } from "@shardveil/shared";
import { toast as hotToast } from "react-hot-toast";

const toast = {
  success: (msg: string) => hotToast.success(msg),
  error: (msg: string) => hotToast.error(msg, { duration: 6000 }),
  info: (msg: string) => hotToast(msg, { icon: "ℹ️" }),
  loading: (msg: string) => hotToast.loading(msg),
  dismiss: (id?: string) => hotToast.dismiss(id),

  // rarity toast — themed by rarity with matching border/icon color
  rarity: (rarity: CardRarity, msg: string) => {
    const colors: Record<CardRarity, string> = {
      COMMON: "#9ca3af",
      UNCOMMON: "#22c55e",
      RARE: "#3b82f6",
      EPIC: "#a855f7",
      LEGENDARY: "#f59e0b",
      MYTHIC: "#ec4899",
    };
    const color = colors[rarity];
    return hotToast(msg, {
      style: {
        borderColor: color,
        borderWidth: "1px",
        borderStyle: "solid",
      },
      icon: "✨",
      duration: 5000,
    });
  },
};

export { toast };
export type { CardRarity };
