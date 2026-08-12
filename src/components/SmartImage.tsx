import { useState } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Responsive srcset generated at build time (vite-imagetools) */
  srcSet?: string;
  sizes?: string;
  /** LCP images: eager + high fetch priority, no lazy loading */
  priority?: boolean;
  /** Wrapper classes (aspect ratio / layout stability) */
  wrapperClassName?: string;
  fallbackSrc?: string;
}

/**
 * Image robuste et performante :
 * - lazy loading + decoding async (hors LCP)
 * - srcset/sizes responsives (WebP généré au build)
 * - placeholder pour éviter le CLS
 * - repli automatique si l'image est indisponible
 */
const SmartImage = ({
  src,
  srcSet,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px",
  alt,
  priority = false,
  className,
  wrapperClassName,
  fallbackSrc = "/placeholder.svg",
  ...rest
}: SmartImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const finalSrc = errored ? fallbackSrc : src;

  return (
    <div className={cn("relative overflow-hidden bg-muted", wrapperClassName)}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
      )}
      <img
        src={finalSrc}
        srcSet={errored ? undefined : srcSet}
        sizes={errored || !srcSet ? undefined : sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        // @ts-ignore: React 18 types do not support fetchpriority yet, but React 18 DOM requires it lowercase
        fetchpriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setErrored(true);
          setLoaded(true);
        }}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...rest}
      />
    </div>
  );
};

export default SmartImage;