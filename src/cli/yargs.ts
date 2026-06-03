import yargs, { type Options } from "yargs";
import { hideBin } from "yargs/helpers";

export const yargsInit = <O extends Record<string, Options>>(options: O) =>
  yargs(hideBin(process.argv)).alias("h", "help").version(false).options(options);
