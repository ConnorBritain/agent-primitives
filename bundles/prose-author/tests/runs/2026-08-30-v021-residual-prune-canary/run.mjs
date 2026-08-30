#!/usr/bin/env node

import { runResidualPruneCanary } from "../../residual-prune-canary.mjs";

await runResidualPruneCanary(import.meta.url, process.argv[2]);
