import { buildServer } from "./infrastructure/http/server";
import { env } from "./infrastructure/config/env";
import { createPool } from "./infrastructure/db/pool";
import { PostgresPriceBookRepository } from "./infrastructure/repositories/PostgresPriceBookRepository";
import { readyRoute } from "./infrastructure/http/routes/ready.route";
import { quoteRoute } from "./infrastructure/http/routes/quote.route";

async function main() {
  const pool = createPool();
  const priceBookRepository = new PostgresPriceBookRepository(pool);

  const app = buildServer();

  app.register(readyRoute, { pool });
  app.register(quoteRoute, {
    prefix: "/api/v1",
    priceBookRepository,
  });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down gracefully");
    try {
      await app.close();
      await pool.end();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info({ port: env.PORT }, "Server listening");
  } catch (err) {
    app.log.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

void main();
