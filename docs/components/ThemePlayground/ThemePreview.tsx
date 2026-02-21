import type { ThemeTokensMap } from "@openlv/modal/theme";
import { useEffect, useRef } from "react";

type ThemePreviewProps = {
  theme: ThemeTokensMap;
  mode: "light" | "dark";
};

export const ThemePreview = ({ theme, mode }: ThemePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLElement | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const [
          { OpenLVModalElement, registerOpenLVModal },
          { createProvider },
        ] = await Promise.all([
          import("@openlv/modal"),
          import("@openlv/provider"),
        ]);

        if (cancelled) return;

        registerOpenLVModal();

        if (elementRef.current) {
          elementRef.current.remove();
          elementRef.current = undefined;
        }

        const provider = createProvider({});

        const element = new OpenLVModalElement({
          provider,
          onClose: () => {},
          theme: { theme: structuredClone(theme), mode },
        });

        element.style.display = "block";
        container.append(element);
        element.showModal();
        elementRef.current = element;
      }
      catch (error) {
        console.error("[ThemePreview] Failed to render modal preview:", error);
      }
    };

    setup();

    return () => {
      cancelled = true;

      if (elementRef.current) {
        elementRef.current.remove();
        elementRef.current = undefined;
      }
    };
  }, [theme, mode]);

  return (
    <div className="rounded-lg border border-(--vocs-color_codeInlineBorder) bg-(--vocs-color_codeBlockBackground) p-6">
      <h3 className="mb-3 font-semibold">Preview</h3>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          transform: "translateZ(0)",
          overflow: "visible",
          height: "500px",
          borderRadius: "8px",
        }}
      />
    </div>
  );
};
