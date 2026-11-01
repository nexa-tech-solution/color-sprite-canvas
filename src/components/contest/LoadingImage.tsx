import { useState, type ImgHTMLAttributes } from "react";

/** Remote image with a pulsing placeholder until it has loaded. */
export function LoadingImage({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [ready, setReady] = useState(false);
  return (
    <img
      {...props}
      onLoad={() => setReady(true)}
      onError={() => setReady(true)}
      className={`${className ?? ""} ${ready ? "" : "animate-pulse bg-slate-100"}`}
    />
  );
}
