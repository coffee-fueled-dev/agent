import { httpRouter } from "convex/server";
import {
  binaryEmbeddingCompletePath,
  binaryEmbeddingFailPath,
  completeBinaryEmbeddingProcessHttp,
  failBinaryEmbeddingProcessHttp,
} from "./context/http";
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

http.route({
  path: binaryEmbeddingCompletePath,
  method: "POST",
  handler: completeBinaryEmbeddingProcessHttp,
});

http.route({
  path: binaryEmbeddingFailPath,
  method: "POST",
  handler: failBinaryEmbeddingProcessHttp,
});

export default http;
