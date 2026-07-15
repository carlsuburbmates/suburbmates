import "server-only";

export function runtimeEnv(name: string): string | undefined {
  return process.env[name];
}
