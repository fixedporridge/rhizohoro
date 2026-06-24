



import Image from "next/image"; 

import { cn } from "@/lib/utils";

type ResultCardProps = {
  value: number;
  variant: "points" | "growth"; 
};

export const ResultCard = ({ value, variant }: ResultCardProps) => {
  const imageSrc =
 variant === "points" 
 ?"/points.svg"
 : "/heart.svg"; 

  return (
    <div
      className={cn(
        "w-full rounded-2xl border-2",
        variant === "points" && "border-orange-400 bg-orange-400",
        variant === "growth" && "border-green-500 bg-green-500" 
      )}
    >
      <div
        className={cn(
          "rounded-t-xl p-1.5 text-center text-xs font-bold uppercase text-white",
          variant === "points" && "bg-orange-400",
          variant === "growth" && "bg-green-500" 
        )}
      >
        {variant === "growth" ? "Growth" : "Total XP"} 
      </div>

      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-white p-6 text-lg font-bold",
          variant === "points" && "text-orange-400",
          variant === "growth" && "text-green-500" 
        )}
      >
        <Image
          src={imageSrc}
          alt={variant}
          height={30}
          width={30}
          className="mr-1.5"
        />
        {value}
      </div>
    </div>
  );
}; 

