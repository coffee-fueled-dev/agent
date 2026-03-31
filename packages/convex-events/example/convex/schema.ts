import { defineSchema } from "convex/server";
import { busTables } from "./events";

export default defineSchema({ ...busTables });
