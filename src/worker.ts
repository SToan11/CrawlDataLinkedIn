import { config } from "./config";
import { prisma } from "./db/prisma";
import { logger, serializeError } from "./utils/logger";
import { runOneWorkerIteration } from "./queue/workerLoop";

async function main(): Promise<void> {
  await prisma.$connect();
  logger.info("Worker started", { pollMs: config.workerPollMs });

  // Polling loop is simple and reliable for low/medium throughput workloads.
  while (true) {
    try {
      for (let i = 0; i < config.workerBatchSize; i += 1) {
        await runOneWorkerIteration();
      }
    } catch (err) {
      logger.error("Worker loop error", { error: serializeError(err) });
    }

    await new Promise((resolve) => setTimeout(resolve, config.workerPollMs));
  }
}

main().catch((err) => {
  logger.error("Worker startup failed", { error: serializeError(err) });
  prisma
    .$disconnect()
    .catch(() => {
      // noop
    })
    .finally(() => process.exit(1));
});
