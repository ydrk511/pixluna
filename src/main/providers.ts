import { SourceProvider } from "../utils/type";
import { LoliconSourceProvider } from "./providers/lolicon";

export type ProviderTypes = "lolicon";

export const Providers: {
  [K in ProviderTypes]: typeof SourceProvider;
} = {
  "lolicon": LoliconSourceProvider,
};

export const provider: typeof SourceProvider = Providers["lolicon"];
