import { APP_NAME } from "@calcom/lib/constants";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  test("renders the platform wordmark with accessible branding", () => {
    render(<Logo />);

    expect(screen.getByRole("img", { name: APP_NAME })).toHaveAttribute("src", "/api/logo");
    expect(document.querySelector('img[src="/api/logo?type=logo-dark"]')).toHaveAttribute("alt", "");
  });

  test("renders the platform icon without applying color inversion", () => {
    render(<Logo icon />);

    const logo = screen.getByRole("img", { name: APP_NAME });
    expect(logo).toHaveAttribute("src", "/api/logo?type=icon");
    expect(logo).not.toHaveClass("dark:invert");
  });
});
