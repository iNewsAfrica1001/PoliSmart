import app from "../server.js";
import { normalizeVercelApiRequest } from "./vercelRouting.js";

export default function handler(request, response) {
  normalizeVercelApiRequest(request);
  return app(request, response);
}
