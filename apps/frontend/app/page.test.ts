import { describe, expect, test } from "bun:test";
import { resolveRootRedirectPath } from "./root-redirect";

describe("root route", () => {
  test("resolves the app launch path to the provider picker", () => {
    // The "/" route is now the marketing landing page (app/page.tsx); this
    // helper still resolves where its "Launch app" link should point.
    expect(resolveRootRedirectPath()).toBe("/providers");
  });
});
