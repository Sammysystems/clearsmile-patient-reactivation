import { createAdminClient } from "@insforge/sdk";

export const admin = createAdminClient({
  baseUrl: process.env.INSFORGE_URL!,
  apiKey: process.env.INSFORGE_API_KEY!,
});