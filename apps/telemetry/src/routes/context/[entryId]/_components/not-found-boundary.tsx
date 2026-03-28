import { Component, type ErrorInfo, type ReactNode } from "react";
import { assignLocation } from "@/navigation/assign-location.js";

export class NotFoundBoundary extends Component<
  { fallbackHref: string; children: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override componentDidCatch(_error: Error, _info: ErrorInfo) {}
  override render() {
    if (this.state.hasError) {
      assignLocation(this.props.fallbackHref);
      return (
        <div className="p-6 text-sm text-muted-foreground">Redirecting...</div>
      );
    }
    return this.props.children;
  }
}
