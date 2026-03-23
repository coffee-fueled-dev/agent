import { httpRouter } from "convex/server";
import {
  completeFileProcessHttp,
  contextFileCompletePath,
  contextFileFailPath,
  failFileProcessHttp,
} from "./context/fileHttp";
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

http.route({
  path: contextFileCompletePath,
  method: "POST",
  handler: completeFileProcessHttp,
});

http.route({
  path: contextFileFailPath,
  method: "POST",
  handler: failFileProcessHttp,
});

export default http;
