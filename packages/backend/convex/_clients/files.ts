import { FilesClient } from "../_components/files/client/index.js";
import { components } from "../_generated/api.js";

export const filesClient = new FilesClient(components.files);
