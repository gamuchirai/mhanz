import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { useNavigationStore } from "../store/useNavigationStore";

beforeEach(() => {
  useNavigationStore.getState().reset("Home");
});
