import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

const processWithEnvLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

processWithEnvLoader.loadEnvFile?.();

afterEach(() => {
  vi.restoreAllMocks();
});
