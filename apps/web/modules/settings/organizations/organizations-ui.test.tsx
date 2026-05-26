import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({ viewer: { organizations: { list: { invalidate: vi.fn() } } } }),
    viewer: {
      organizations: {
        list: {
          useQuery: () => ({ data: [], isLoading: false }),
        },
        create: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        update: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/settings/organizations",
  useParams: () => ({ id: "1" }),
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

import OrganizationsListingView from "./organizations-listing-view";
import OrgNewView from "./org-new-view";

describe("OrganizationsListingView", () => {
  it("renders empty state when no organizations", () => {
    render(<OrganizationsListingView />);
    expect(screen.getByText("no_organizations")).toBeInTheDocument();
  });

  it("renders Create Organization button", () => {
    render(<OrganizationsListingView />);
    expect(screen.getByTestId("new-org-btn")).toBeInTheDocument();
  });
});

describe("OrgNewView", () => {
  it("renders org name and slug fields", () => {
    render(<OrgNewView />);
    expect(screen.getByTestId("org-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("org-slug-input")).toBeInTheDocument();
  });

  it("Create button disabled when name is empty", () => {
    render(<OrgNewView />);
    expect(screen.getByTestId("create-org-btn")).toBeDisabled();
  });

  it("auto-generates slug from org name", async () => {
    render(<OrgNewView />);
    const nameInput = screen.getByTestId("org-name-input");
    fireEvent.change(nameInput, { target: { value: "Acme Corporation" } });
    await waitFor(() => {
      const slugInput = screen.getByTestId("org-slug-input") as HTMLInputElement;
      expect(slugInput.value).toBe("acme-corporation");
    });
  });

  it("Create button enabled once name is filled", async () => {
    render(<OrgNewView />);
    fireEvent.change(screen.getByTestId("org-name-input"), { target: { value: "My Org" } });
    await waitFor(() => {
      expect(screen.getByTestId("create-org-btn")).not.toBeDisabled();
    });
  });
});
