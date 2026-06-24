import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scriptPath = new URL("./x402-refresh.sh", import.meta.url).pathname;

type Captured = { authorization: string | null; method: string; path: string };

const startMockBff = (status: number, responseBody: string) => {
  const calls: Captured[] = [];
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      calls.push({
        authorization: request.headers.get("authorization"),
        method: request.method,
        path: url.pathname,
      });
      return new Response(responseBody, {
        status,
        headers: { "content-type": "application/json" },
      });
    },
  });
  return { server, calls };
};

const runScript = async (envFile: string) => {
  const child = Bun.spawn(["bash", scriptPath, envFile], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await child.exited;
  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  return { exitCode, stdout, stderr };
};

describe("x402-refresh cron script", () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "x402-refresh-"));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  const writeEnvFile = (url: string, token: string, extra = ""): string => {
    const envPath = join(workDir, "x402-refresh.env");
    writeFileSync(
      envPath,
      `BFF_X402_REFRESH_URL=${url}\nBFF_X402_REFRESH_TOKEN=${token}\n${extra}`,
    );
    return envPath;
  };

  test("POSTs to the refresh endpoint with the bearer token and exits 0 on 200", async () => {
    const { server, calls } = startMockBff(200, '{"status":"ok","fetched":3}');
    try {
      const url = `http://127.0.0.1:${server.port}/main/aeo/x402/refresh`;
      const envPath = writeEnvFile(url, "secret-token-123");

      const { exitCode, stdout } = await runScript(envPath);

      expect(exitCode).toBe(0);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.method).toBe("POST");
      expect(calls[0]?.path).toBe("/main/aeo/x402/refresh");
      expect(calls[0]?.authorization).toBe("Bearer secret-token-123");
      expect(stdout).toContain("status");
    } finally {
      server.stop(true);
    }
  });

  test("exits non-zero when the endpoint rejects the token", async () => {
    const { server } = startMockBff(401, '{"error":"unauthorized"}');
    try {
      const url = `http://127.0.0.1:${server.port}/main/aeo/x402/refresh`;
      const envPath = writeEnvFile(url, "wrong-token");

      const { exitCode, stderr } = await runScript(envPath);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("401");
    } finally {
      server.stop(true);
    }
  });

  test("exits non-zero on a 5xx refresh failure", async () => {
    const { server } = startMockBff(502, '{"error":"x402_refresh_failed"}');
    try {
      const url = `http://127.0.0.1:${server.port}/develop/aeo/x402/refresh`;
      const envPath = writeEnvFile(url, "secret-token-123");

      const { exitCode, stderr } = await runScript(envPath);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("502");
    } finally {
      server.stop(true);
    }
  });

  test("fails fast when the token is missing from the env file", async () => {
    const envPath = join(workDir, "x402-refresh.env");
    writeFileSync(envPath, "BFF_X402_REFRESH_URL=http://127.0.0.1:1/refresh\n");

    const { exitCode, stderr } = await runScript(envPath);

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("BFF_X402_REFRESH_TOKEN");
  });

  test("fails when the env file does not exist", async () => {
    const { exitCode, stderr } = await runScript(join(workDir, "missing.env"));

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("env file not found");
  });
});
