function fmt(level: string, msg: string, meta?: unknown): string {
  const base = `[${new Date().toISOString()}] [${level}] ${msg}`;
  if (!meta) return base;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch {
    return `${base} {"meta":"[unserializable]"}`;
  }
}

type ErrorLike = {
  message?: unknown;
  name?: unknown;
  stack?: unknown;
  code?: unknown;
  detail?: unknown;
  cause?: unknown;
};

export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const out: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
    const asAny = err as ErrorLike;
    if (asAny.code !== undefined) out.code = asAny.code;
    if (asAny.detail !== undefined) out.detail = asAny.detail;
    if (asAny.cause !== undefined) out.cause = asAny.cause;
    return out;
  }

  if (typeof err === "string") {
    return { message: err };
  }

  if (err && typeof err === "object") {
    const asObj = err as ErrorLike;
    return {
      name: asObj.name,
      message: asObj.message,
      stack: asObj.stack,
      code: asObj.code,
      detail: asObj.detail
    };
  }

  return { message: String(err) };
}

export const logger = {
  info(msg: string, meta?: unknown): void {
    console.log(fmt("INFO", msg, meta));
  },
  warn(msg: string, meta?: unknown): void {
    console.warn(fmt("WARN", msg, meta));
  },
  error(msg: string, meta?: unknown): void {
    console.error(fmt("ERROR", msg, meta));
  }
};
