import { SourceProvider } from "../utils/type";
import { LoliconSourceProvider } from "./providers/lolicon";
import { LolisukiSourceProvider } from "./providers/lolisuki";
import type { Config } from "../config";

export type ProviderTypes = "none" | "lolicon" | "lolisuki";

export const Providers: {
  [K in ProviderTypes]: typeof SourceProvider;
} = {
  "none": null,
  "lolicon": LoliconSourceProvider,
  "lolisuki": LolisukiSourceProvider,
};

export function getProvider(config: Config): typeof SourceProvider {
  return Providers[config.defaultSourceProvider];
}
