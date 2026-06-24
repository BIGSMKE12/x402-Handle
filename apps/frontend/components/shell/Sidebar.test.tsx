import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

// Stub only the Next runtime modules (no Next server/router under `bun test`) and
// @/app/providers (its `useProviders` hook throws without a context provider). The
// other app modules (Icon, brand, sdk-fixtures, …) render fine with their real
// implementations and are intentionally NOT mocked: bun's mock.module() is
// process-global and persists, so stubbing real app modules here would leak into
// every other test file that imports them. The @/app/providers stub deliberately
// includes ALL of the module's real exports so importers of the other exports are
// not broken by the leak.
mock.module("next/image", () => ({
  default: ({
    alt,
    priority: _priority,
    ...props
  }: React.ComponentProps<"img"> & { priority?: boolean }) => <img alt={alt ?? ""} {...props} />,
}));

mock.module("next/link", () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: React.ComponentProps<"a"> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

mock.module("next/navigation", () => ({
  usePathname: () => "/providers",
}));

mock.module("@/app/providers", () => ({
  ProvidersContextProvider: ({ children }: { children: React.ReactNode }) => children,
  useProviders: () => ({
    stored: [],
    userProviders: [],
    hydrated: true,
    demoOpted: false,
  }),
  useActiveProvider: () => ({ active: undefined, hydrated: true }),
}));

describe("Sidebar", () => {
  test("renders the commercial analytics brand label", async () => {
    const { Sidebar } = await import("./Sidebar");
    const html = renderToStaticMarkup(
      <Sidebar activeProviderId={undefined} activeRoute={undefined} dataMode="onChainOnly" />,
    );

    expect(html).toContain("Commercial Analytics");
    expect(html).not.toContain("Agent Payments");
  });
});
