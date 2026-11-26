/**
 * A stand-in for a canvas context that records what was asked of it. Tests use
 * it to check the drawing itself — there is no canvas in a test run, and a
 * renderer's job is exactly the calls it makes.
 *
 * Not exported from the package: it is test support, not a public API.
 */

export interface Call {
  method: string;
  args: unknown[];
}

export interface Recorder {
  ctx: CanvasRenderingContext2D;
  calls: Call[];
  of(method: string): Call[];
  texts(): string[];
}

export function recordingContext(): Recorder {
  const calls: Call[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return method === "measureText" ? { width: String(args[0] ?? "").length * 6 } : undefined;
    };
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get(target, key: string) {
      if (key in target) return target[key];
      return (target[key] = record(key));
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    calls,
    of: (method) => calls.filter((c) => c.method === method),
    texts: () => calls.filter((c) => c.method === "fillText").map((c) => String(c.args[0])),
  };
}
