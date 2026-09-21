import {
  PostgreSqlContainer,
} from "@testcontainers/postgresql";

import {
  GenericContainer,
  Wait,
} from "testcontainers";

let postgresContainer:
  | Awaited<ReturnType<PostgreSqlContainer["start"]>>
  | undefined;

let redisContainer:
  | Awaited<ReturnType<GenericContainer["start"]>>
  | undefined;

export async function startContainers() {
  postgresContainer =
    await new PostgreSqlContainer(
      "postgres:17-alpine",
    )
      .withDatabase("club_management_test")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();

  redisContainer =
    await new GenericContainer(
      "redis:7-alpine",
    )
      .withExposedPorts(6379)
      .withWaitStrategy(
        Wait.forLogMessage(
          /Ready to accept connections/,
        ),
      )
      .start();

  process.env.DATABASE_URL =
    postgresContainer.getConnectionUri();

  process.env.REDIS_URL =
    `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(
      6379,
    )}`;

  return {
    postgresContainer,
    redisContainer,
  };
}

export async function stopContainers() {
  await redisContainer?.stop();
  await postgresContainer?.stop();
}