import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrganization: vi.fn(),
  invalidateOrganizationList: vi.fn().mockResolvedValue(undefined),
  routerPush: vi.fn(),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: { admin: { listOrganizations: { invalidate: mocks.invalidateOrganizationList } } },
    }),
    viewer: {
      admin: {
        provisionOrganization: {
          useMutation: (options?: { onSuccess?: () => void | Promise<void> }) => ({
            mutate: (input: { name: string; slug: string; ownerEmail: string; bio?: string }) => {
              mocks.createOrganization(input);
              void options?.onSuccess?.();
            },
            isPending: false,
          }),
        },
      },
      organizations: {
        list: {
          useQuery: () => ({ data: [], isLoading: false }),
        },
        update: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
  usePathname: () => "/settings/organizations",
  useParams: () => ({ id: "1" }),
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

import OrgNewView from "./org-new-view";
import OrganizationsListingView from "./organizations-listing-view";

describe("OrganizationsListingView", () => {
  it("renders empty state when no organizations", () => {
    render(<OrganizationsListingView />);
    expect(screen.getByText("no_organizations")).toBeInTheDocument();
  });

  it("does not render a create organization button", () => {
    render(<OrganizationsListingView />);
    expect(screen.queryByTestId("new-org-btn")).not.toBeInTheDocument();
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
    fireEvent.change(screen.getByTestId("org-owner-email-input"), { target: { value: "owner@example.com" } });
    await waitFor(() => {
      expect(screen.getByTestId("create-org-btn")).not.toBeDisabled();
    });
  });

  it("creates the organization, refreshes the list, and opens its settings", async () => {
    render(<OrgNewView />);

    fireEvent.change(screen.getByTestId("org-name-input"), { target: { value: "My Org" } });
    fireEvent.change(screen.getByTestId("org-owner-email-input"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByTestId("create-org-btn"));

    await waitFor(() => {
      expect(mocks.createOrganization).toHaveBeenCalledWith({
        name: "My Org",
        slug: "my-org",
        ownerEmail: "owner@example.com",
        bio: undefined,
      });
      expect(mocks.invalidateOrganizationList).toHaveBeenCalledOnce();
      expect(mocks.routerPush).toHaveBeenCalledWith("/settings/admin/organizations");
    });
  });
});
