import type { Composable } from "./_libs/toolkit";
import { contextToolkit } from "./context/toolkit";
import { filesystemToolkit } from "./filesystem/toolkit";

/** Registry composables (one instance per entry) for `toolLibrary`. */
export const contextComposable: Composable = contextToolkit();
export const filesystemComposable: Composable = filesystemToolkit();
