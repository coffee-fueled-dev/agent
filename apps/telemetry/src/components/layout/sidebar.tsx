import { PanelLeftIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SidebarContextValue {
  /** Desktop: wide vs icon rail */
  isExpanded: boolean;
  toggleExpanded: () => void;
  /** Mobile sheet */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined,
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

const STORAGE_KEY = "sidebar-expanded";

export const SidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsExpanded(JSON.parse(stored) as boolean);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded));
    }
  }, [isExpanded, hydrated]);

  const value: SidebarContextValue = {
    isExpanded,
    toggleExpanded: () => setIsExpanded((prev) => !prev),
    mobileOpen,
    setMobileOpen,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const { isExpanded } = useSidebar();
  return (
    <div
      className={cn(
        "bg-sidebar text-sidebar-foreground flex h-full min-h-0 flex-col p-4",
        isExpanded ? "w-64" : "w-16",
        "transition-[width] duration-200 ease-in-out",
      )}
    >
      {children}
    </div>
  );
};

export const SidebarHeader = ({ children }: { children: React.ReactNode }) => {
  const { isExpanded } = useSidebar();
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2",
        !isExpanded && "items-center",
      )}
    >
      {children}
    </div>
  );
};

export const SidebarMain = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-4 justify-start">{children}</div>
    </div>
  );
};

export const SidebarFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex shrink-0 flex-col gap-2", className)}>
      {children}
    </div>
  );
};

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "bg-background relative flex min-h-0 w-full min-w-0 flex-1 flex-col",
        className,
      )}
      {...props}
    />
  );
}

export const SidebarGroup = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex w-full flex-col gap-1">{children}</div>;
};

export const SidebarGroupLabel = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <h4 className="text-xs font-medium text-muted-foreground">{children}</h4>
  );
};

export const SidebarGroupContent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isExpanded } = useSidebar();
  return (
    <div className={cn("flex flex-col gap-1", !isExpanded && "items-center")}>
      {children}
    </div>
  );
};

export const SidebarGroupButton = ({
  children,
  size = "default",
  collapsed = false,
  depth = 0,
  className,
  style,
  variant = "ghost",
  ...props
}: React.ComponentProps<typeof Button> & {
  depth?: number;
  collapsed?: boolean;
}) => {
  return (
    <Button
      variant={variant}
      asChild
      size={collapsed ? "icon" : size}
      className={cn(
        "flex items-center gap-2",
        !collapsed && "w-full justify-start",
        depth > 0 && "text-muted-foreground",
        className,
      )}
      style={{
        paddingLeft: depth > 0 && !collapsed ? `${depth + 1}rem` : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

/**
 * Opens the mobile nav sheet below `md`, toggles the desktop sidebar rail at `md+`.
 * Visibility is controlled by the caller via `className` / layout.
 */
export function SidebarPanelControl({
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const { openMobile, toggleExpanded } = useSidebar();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      onClick={() => {
        if (
          typeof window !== "undefined" &&
          window.matchMedia("(min-width: 768px)").matches
        ) {
          toggleExpanded();
        } else {
          openMobile();
        }
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Open menu</span>
    </Button>
  );
}

export function MobileSidebarSheet({
  children,
  footer,
}: {
  children: ReactNode;
  /** Pinned below scroll (e.g. account menu). */
  footer?: ReactNode;
}) {
  const { mobileOpen, setMobileOpen } = useSidebar();
  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0 md:hidden"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="bg-sidebar text-sidebar-foreground flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            <FadeOverflow className="min-h-0 flex-1">
              <div className="flex flex-col gap-4 pr-1">{children}</div>
            </FadeOverflow>
          </div>
          {footer ? (
            <div className="border-sidebar-border shrink-0 border-t px-4 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const INSET_SELECTOR = '[data-slot="sidebar-inset"]';

export function useSidebarInsetHeight(
  ref: React.RefObject<HTMLElement | null>,
): number {
  const [height, setHeight] = useState(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const inset = el.closest(INSET_SELECTOR);
    if (!inset) return;
    const insetRect = inset.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    let bottomPadding = 0;
    let current: Element | null = el.parentElement;
    while (current && current !== inset) {
      bottomPadding += parseFloat(getComputedStyle(current).paddingBottom) || 0;
      current = current.parentElement;
    }
    bottomPadding += parseFloat(getComputedStyle(inset).paddingBottom) || 0;

    setHeight(Math.max(0, insetRect.bottom - elRect.top - bottomPadding));
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const inset = el.closest(INSET_SELECTOR);
    if (!inset) return;

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(inset);
    return () => ro.disconnect();
  }, [ref, measure]);

  return height;
}

export function SidebarInsetFill({
  children,
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const height = useSidebarInsetHeight(ref);

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden", className)}
      style={{ height: height || undefined, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
