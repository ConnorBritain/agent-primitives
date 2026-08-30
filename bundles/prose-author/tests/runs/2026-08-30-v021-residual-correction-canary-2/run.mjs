#!/usr/bin/env node

import { runResidualCorrectionCanary } from "../../residual-correction-canary.mjs";

await runResidualCorrectionCanary(import.meta.url, process.argv[2]);
