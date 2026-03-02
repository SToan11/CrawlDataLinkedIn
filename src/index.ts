import { buildServer } from "./api/server";
import { config } from "./config";
import { prisma } from "./db/prisma";
import { logger, serializeError } from "./utils/logger";

async function main(): Promise<void> {
  await prisma.$connect();

  const app = buildServer();
  app.listen(config.apiPort, () => {
    logger.info(`API listening on port ${config.apiPort}`);
  });
}

main().catch((err) => {
  logger.error("API startup failed", { error: serializeError(err) });
  prisma
    .$disconnect()
    .catch(() => {
      // noop
    })
    .finally(() => process.exit(1));
});
