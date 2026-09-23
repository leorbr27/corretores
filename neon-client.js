import { createClient, BetterAuthVanillaAdapter } from "https://esm.sh/@neondatabase/neon-js@latest";

const AUTH_URL = "https://ep-falling-frost-ac6kshzo.neonauth.sa-east-1.aws.neon.tech/corretores/auth";
const DATA_API_URL = "https://ep-falling-frost-ac6kshzo.apirest.sa-east-1.aws.neon.tech/corretores/rest/v1";

export const neon = createClient({
  auth: {
    adapter: BetterAuthVanillaAdapter(),
    url: AUTH_URL,
    allowAnonymous: true
  },
  dataApi: {
    url: DATA_API_URL
  }
});

export async function requireAdminSession() {
  const { data, error } = await neon.auth.getSession();
  if (error || !data?.user) {
    location.replace("auth.html");
    throw new Error("Sessão administrativa não encontrada.");
  }
  return data;
}
