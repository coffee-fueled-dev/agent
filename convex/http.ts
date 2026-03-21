import { httpRouter } from "convex/server";
import {
  publicMemoryFilePath,
  servePublicMemoryFile,
} from "./llms/memoryFiles";

const http = httpRouter();

http.route({
  path: publicMemoryFilePath,
  method: "GET",
  handler: servePublicMemoryFile,
});

export default http;
