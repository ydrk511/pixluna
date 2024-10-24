import { SourceProvider } from "../utils/type";
import { LoliconSourceProvider } from "./providers/lolicon";
import type { Config } from "../config";

export type ProviderTypes = "none" | "lolicon";

export const Providers: {
  [K in ProviderTypes]: typeof SourceProvider;
} = {
  "none": null,
  "lolicon": LoliconSourceProvider,
};

export function getProvider(config: Config): typeof SourceProvider {
  return Providers[config.defaultSourceProvider];
}
