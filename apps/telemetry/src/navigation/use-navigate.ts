"use client";

import { useCallback } from "react";
import {
  assignLocation,
  type NavigateOptions,
} from "./assign-location.js";

export function useNavigate() {
  return useCallback((href: string, options?: NavigateOptions) => {
    assignLocation(href, options);
  }, []);
}
