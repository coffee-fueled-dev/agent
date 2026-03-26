import { httpRouter } from "convex/server";
import {
  completeEmbeddingCacheHttp,
  embeddingCacheCompletePath,
  embeddingCacheFailPath,
  failEmbeddingCacheHttp,
} from "./context/embeddingCacheHttp";
import {
  completeFileProcessHttp,
  contextFileCompletePath,
  contextFileFailPath,
  failFileProcessHttp,
} from "./context/fileHttp";

const http = httpRouter();

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

http.route({
  path: embeddingCacheCompletePath,
  method: "POST",
  handler: completeEmbeddingCacheHttp,
});

http.route({
  path: embeddingCacheFailPath,
  method: "POST",
  handler: failEmbeddingCacheHttp,
});

export default http;
