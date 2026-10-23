import { useRef, useState, type CSSProperties } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

export function MarqueeText({ text, className = "", style }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    if (containerRef.current && textRef.current) {
      const overflows = textRef.current.scrollWidth > containerRef.current.clientWidth;
      setIsOverflowing(overflows);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`overflow-hidden relative ${className}`}
      style={{ whiteSpace: "nowrap", ...style }}
    >
      {isOverflowing && isHovered ? (
        <div
          className="inline-flex gap-8"
          style={{
            animation: "marquee 6s linear infinite",
            width: "max-content",
          }}
        >
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      ) : (
        <span ref={textRef} className="block truncate">
          {text}
        </span>
      )}
    </div>
  );
}
