import Retell from "retell-sdk";

export const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
});
