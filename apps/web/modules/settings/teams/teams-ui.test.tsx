import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before the imports they replace
// ---------------------------------------------------------------------------

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({ viewer: { teams: { list: { invalidate: vi.fn() } } } }),
    viewer: {
      teams: {
        list: {
          useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
        },
        create: {
          useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
        },
        inviteMember: {
          useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
        },
        update: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        delete: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        getMembers: {
          useQuery: () => ({ data: [], refetch: vi.fn() }),
        },
        removeMember: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        changeMemberRole: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/settings/teams",
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: 1 } } }),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/features/settings/appDir/SettingsHeader", () => ({
  default: ({ children, title, CTA }: { children: React.ReactNode; title: string; CTA?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {CTA}
      {children}
    </div>
  ),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

// ---------------------------------------------------------------------------

import TeamsListingView from "./teams-listing-view";
import TeamNewView from "./team-new-view";

describe("TeamsListingView", () => {
  it("renders empty state when no teams", () => {
    render(<TeamsListingView />);
    expect(screen.getByText("no_teams")).toBeInTheDocument();
  });

  it("renders Create Team button", () => {
    render(<TeamsListingView />);
    expect(screen.getByTestId("new-team-btn")).toBeInTheDocument();
  });
});

describe("TeamNewView — Step 1", () => {
  it("renders name and slug fields", () => {
    render(<TeamNewView />);
    expect(screen.getByTestId("team-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("team-slug-input")).toBeInTheDocument();
  });

  it("Continue button disabled when name is empty", () => {
    render(<TeamNewView />);
    expect(screen.getByTestId("next-step-btn")).toBeDisabled();
  });

  it("auto-generates slug from name", async () => {
    render(<TeamNewView />);
    const nameInput = screen.getByTestId("team-name-input");
    fireEvent.change(nameInput, { target: { value: "Acme Sales Team" } });
    await waitFor(() => {
      const slugInput = screen.getByTestId("team-slug-input") as HTMLInputElement;
      expect(slugInput.value).toBe("acme-sales-team");
    });
  });

  it("Continue button enabled once name is filled", async () => {
    render(<TeamNewView />);
    fireEvent.change(screen.getByTestId("team-name-input"), { target: { value: "My Team" } });
    await waitFor(() => {
      expect(screen.getByTestId("next-step-btn")).not.toBeDisabled();
    });
  });
});
