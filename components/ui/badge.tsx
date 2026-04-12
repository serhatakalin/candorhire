import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  dotColor?: string;
}

function Badge({ className, children, dotColor = "#6366f1", style, ...props }: BadgeProps) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        borderRadius: "9999px",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        paddingInline: "10px",
        paddingBlock: "4px",
        fontSize: "12px",
        fontWeight: 600,
        color: "#374151",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...props}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          flexShrink: 0,
          backgroundColor: dotColor,
        }}
      />
      {children}
    </div>
  );
}

export { Badge };
