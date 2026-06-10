import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTeam: vi.fn(),
  invalidateTeamList: vi.fn().mockResolvedValue(undefined),
  routerPush: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before the imports they replace
// ---------------------------------------------------------------------------

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({ viewer: { teams: { list: { invalidate: mocks.invalidateTeamList } } } }),
    viewer: {
      teams: {
        list: {
          useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
        },
        create: {
          useMutation: (options?: { onSuccess?: (team: { id: number }) => void | Promise<void> }) => ({
            mutate: (input: { name: string; slug: string }) => {
              mocks.createTeam(input);
              void options?.onSuccess?.({ id: 42 });
            },
            mutateAsync: vi.fn(),
            isPending: false,
          }),
        },
        inviteMember: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn().mockResolvedValue({}),
            isPending: false,
          }),
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
  useRouter: () => ({ push: mocks.routerPush }),
  usePathname: () => "/settings/teams",
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: 1 } } }),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/features/settings/appDir/SettingsHeader", () => ({
  default: ({
    children,
    title,
    CTA,
  }: {
    children: React.ReactNode;
    title: string;
    CTA?: React.ReactNode;
  }) => (
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

import TeamNewView from "./team-new-view";
import TeamsListingView from "./teams-listing-view";

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

  it("creates the team when invitations are skipped and opens the new team", async () => {
    render(<TeamNewView />);

    fireEvent.change(screen.getByTestId("team-name-input"), { target: { value: "My Team" } });
    fireEvent.click(screen.getByTestId("next-step-btn"));
    fireEvent.click(screen.getByTestId("skip-invite-btn"));

    await waitFor(() => {
      expect(mocks.createTeam).toHaveBeenCalledWith({ name: "My Team", slug: "my-team" });
      expect(mocks.invalidateTeamList).toHaveBeenCalledOnce();
      expect(screen.getByText("team_created")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "go_to_team" }));

    await waitFor(() => {
      expect(mocks.routerPush).toHaveBeenCalledWith("/settings/teams/42");
    });
  });
});
