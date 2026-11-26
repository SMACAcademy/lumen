import { ProgressStore, memoryAdapter } from "@ise/progress-store";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "@/lib/progress";
import { HomeHub } from "./HomeHub";
import { ProfileScreen } from "./ProfileScreen";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/home" }));

afterEach(cleanup);

async function show(ui: React.ReactNode) {
  const store = new ProgressStore(memoryAdapter());
  await store.ready;
  await act(async () => {
    render(
      <ProgressProvider store={store}>{ui}</ProgressProvider>,
    );
  });
  return store;
}

const choose = (name: string) => act(async () => fireEvent.click(screen.getByRole("radio", { name })));

describe("asking the class", () => {
  it("asks a new learner which class they are in, then gets out of the way", async () => {
    const store = await show(<HomeHub />);
    expect(screen.getByRole("heading", { name: "Which class are you in?" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Your progress" })).toBeNull();

    await choose("Class 7");
    expect(store.getSnapshot().profile).toMatchObject({ year: 7, yearAsked: true });
    expect(screen.queryByRole("heading", { name: "Which class are you in?" })).toBeNull();
    expect(screen.getByRole("region", { name: "Your progress" })).toBeTruthy();
  });

  it("accepts 'just exploring' as an answer", async () => {
    const store = await show(<HomeHub />);
    await choose("Just exploring");
    expect(store.getSnapshot().profile).toMatchObject({ year: null, yearAsked: true });
    expect(screen.getByRole("region", { name: "Your progress" })).toBeTruthy();
  });

  it("lets the class be changed in the profile", async () => {
    const store = await show(<ProfileScreen />);
    await choose("Class 9");
    expect(store.getSnapshot().profile.year).toBe(9);
    expect(screen.getByRole("radio", { name: "Class 9" }).getAttribute("aria-checked")).toBe("true");
  });
});
