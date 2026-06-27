import { vi } from "vitest";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
  DefaultSession: {},
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$12$hashed"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock fs/promises for upload tests
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  default: {},
}));

// Mock crypto.randomUUID
if (!globalThis.crypto) {
  (globalThis as any).crypto = { randomUUID: () => Math.random().toString(36).slice(2) };
} else if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => Math.random().toString(36).slice(2);
}
