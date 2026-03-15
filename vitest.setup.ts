import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

const processWithEnvLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

processWithEnvLoader.loadEnvFile?.();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/"
}));

afterEach(() => {
  vi.restoreAllMocks();
});
