import { render, screen } from "@testing-library/react";
import type { ErrorInfo } from "react";

import ErrorBoundary from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  test("should render children when no error occurs", () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Child Component</div>
      </ErrorBoundary>
    );

    const childElement = container.querySelector("div");
    expect(childElement).toBeInTheDocument();
    expect(childElement?.textContent).toBe("Child Component");
  });

  test("should render error message and error details when an error occurs", () => {
    const boundary = new ErrorBoundary({
      children: <div>Child Component</div>,
      message: "Error Message",
    });

    boundary.state = {
      error: new Error("Test Error"),
      errorInfo: { componentStack: "stack" } as ErrorInfo,
    };

    render(boundary.render());

    const errorMessage = screen.getByText("Error Message");
    const errorDetails = screen.getByText("Error: Test Error");
    expect(errorMessage).toBeInTheDocument();
    expect(errorDetails).toBeInTheDocument();
  });
});
