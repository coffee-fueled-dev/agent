/** Side-effect imports so `declare module "./registeredToolMap"` merges run before `RegisteredUITools` is used. */
import "./context/searchContext/tool";
import "./context/browseContext/tool";
import "./context/authoring/toolkit";
import "./filesystem/runShell/tool";
