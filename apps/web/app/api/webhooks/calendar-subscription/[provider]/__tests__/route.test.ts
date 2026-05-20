import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockCalendarSubscriptionService,
  mockCalendarSubscriptionServiceInstance,
} = vi.hoisted(() => {
  const mockCalendarSubscriptionServiceInstance = {
    isCacheEnabled: vi.fn(),
    isSyncEnabled: vi.fn(),
    processWebhook: vi.fn(),
  };

  return {
    mockCalendarSubscriptionService: vi.fn(function MockCalendarSubscriptionService() {
      return mockCalendarSubscriptionServiceInstance;
    }),
    mockCalendarSubscriptionServiceInstance,
  };
});

const routeMocks = vi.hoisted(() => ({
  calendarSyncService: vi.fn(function MockCalendarSyncService() {
    return {
      handleEvents: vi.fn(),
    };
  }),
  calendarCacheEventService: vi.fn(function MockCalendarCacheEventService() {
    return {
      handleEvents: vi.fn(),
      cleanupCache: vi.fn(),
      cleanupStaleCache: vi.fn(),
    };
  }),
}));

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    url: string;
    method: string;
    nextUrl: { searchParams: URLSearchParams };
    private _headers: Map<string, string>;

    constructor(url: string, options: { method?: string } = {}) {
      this.url = url;
      this.method = options.method || "POST";
      this._headers = new Map();
      this.nextUrl = { searchParams: new URLSearchParams(url.split("?")[1] || "") };
    }

    headers = {
      get: (key: string): string | null => this._headers.get(key.toLowerCase()) || null,
      set: (key: string, value: string): void => {
        this._headers.set(key.toLowerCase(), value);
      },
      has: (key: string): boolean => this._headers.has(key.toLowerCase()),
    };
  },
  NextResponse: {
    json: vi.fn((body, init) => ({
      json: vi.fn().mockResolvedValue(body),
      status: init?.status || 200,
    })),
  },
}));

vi.mock("@calcom/features/calendar-subscription/lib/CalendarSubscriptionService", () => ({
  CalendarSubscriptionService: mockCalendarSubscriptionService,
}));
vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService", () => ({
  CalendarCacheEventService: vi.fn(function MockCalendarCacheEventService() {
    return {};
  }),
}));
vi.mock("@calcom/features/calendar-subscription/lib/sync/CalendarSyncService", () => ({
  CalendarSyncService: vi.fn(function MockCalendarSyncService() {
    return {};
  }),
}));
vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn(function MockBookingRepository() {
    return {};
  }),
}));
vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository", () => ({
  CalendarCacheEventRepository: vi.fn(function MockCalendarCacheEventRepository() {
    return {};
  }),
}));
vi.mock("@calcom/features/calendar-subscription/adapters/AdaptersFactory", () => ({
  DefaultAdapterFactory: vi.fn(function MockDefaultAdapterFactory() {
    return {};
  }),
}));
vi.mock("@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository", () => ({
  SelectedCalendarRepository: vi.fn(function MockSelectedCalendarRepository() {
    return {};
  }),
}));
vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: vi.fn(() => ({})),
}));
vi.mock("@calcom/features/di/containers/TeamFeatureRepository", () => ({
  getTeamFeatureRepository: vi.fn(() => ({})),
}));
vi.mock("@calcom/features/di/containers/UserFeatureRepository", () => ({
  getUserFeatureRepository: vi.fn(() => ({})),
}));
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    })),
  },
}));
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));
vi.mock("@calcom/web/app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: vi.fn((handler) => handler),
}));

describe("/api/webhooks/calendar-subscription/[provider]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCalendarSubscriptionServiceInstance.isCacheEnabled.mockResolvedValue(true);
    mockCalendarSubscriptionServiceInstance.isSyncEnabled.mockResolvedValue(false);
    mockCalendarSubscriptionServiceInstance.processWebhook.mockResolvedValue(undefined);
  });

  describe("Provider validation", () => {
    test("should accept google_calendar provider", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(response.status).toBe(200);
      expect(mockCalendarSubscriptionServiceInstance.processWebhook).toHaveBeenCalledWith(
        "google_calendar",
        request
      );
    });

    test("should accept office365_calendar provider", async () => {
      const request = new NextRequest(
        "http://localhost/api/webhooks/calendar-subscription/office365_calendar",
        { method: "POST" }
      );

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "office365_calendar" }),
      });

      expect(response.status).toBe(200);
      expect(mockCalendarSubscriptionServiceInstance.processWebhook).toHaveBeenCalledWith(
        "office365_calendar",
        request
      );
    });

    test("should reject unsupported provider", async () => {
      const request = new NextRequest(
        "http://localhost/api/webhooks/calendar-subscription/unsupported_calendar",
        { method: "POST" }
      );

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "unsupported_calendar" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Unsupported provider");
    });
  });

  describe("Feature flag handling", () => {
    test("should return 200 when neither cache nor sync is enabled", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });
      mockCalendarSubscriptionServiceInstance.isCacheEnabled.mockResolvedValue(false);
      mockCalendarSubscriptionServiceInstance.isSyncEnabled.mockResolvedValue(false);

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("No cache or sync enabled");
      expect(mockCalendarSubscriptionServiceInstance.processWebhook).not.toHaveBeenCalled();
    });

    test("should process webhook when cache is enabled", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Webhook processed");
      expect(mockCalendarSubscriptionServiceInstance.processWebhook).toHaveBeenCalledWith(
        "google_calendar",
        request
      );
    });

    test("should process webhook when sync is enabled", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });
      mockCalendarSubscriptionServiceInstance.isCacheEnabled.mockResolvedValue(false);
      mockCalendarSubscriptionServiceInstance.isSyncEnabled.mockResolvedValue(true);

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Webhook processed");
      expect(mockCalendarSubscriptionServiceInstance.processWebhook).toHaveBeenCalledWith(
        "google_calendar",
        request
      );
    });

    test("should process webhook when both cache and sync are enabled", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });
      mockCalendarSubscriptionServiceInstance.isSyncEnabled.mockResolvedValue(true);

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Webhook processed");
      expect(mockCalendarSubscriptionServiceInstance.processWebhook).toHaveBeenCalledWith(
        "google_calendar",
        request
      );
    });
  });

  describe("Error handling", () => {
    test("should handle webhook processing errors gracefully", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });
      mockCalendarSubscriptionServiceInstance.processWebhook.mockRejectedValue(
        new Error("Webhook validation failed")
      );

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Webhook validation failed");
    });

    test("should handle non-Error exceptions", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });
      mockCalendarSubscriptionServiceInstance.processWebhook.mockRejectedValue("String error");

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Unknown error");
    });

    test("should handle feature flag check errors", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });
      mockCalendarSubscriptionServiceInstance.isCacheEnabled.mockRejectedValue(
        new Error("Feature flag service unavailable")
      );

      const { POST } = await import("../route");
      const response = await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Feature flag service unavailable");
    });
  });

  describe("Service instantiation", () => {
    test("should instantiate all services with correct dependencies", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/calendar-subscription/google_calendar", {
        method: "POST",
      });

      const { POST } = await import("../route");
      await POST(request, {
        params: Promise.resolve({ provider: "google_calendar" }),
      });

      expect(mockCalendarSubscriptionService).toHaveBeenCalledWith({
        adapterFactory: expect.any(Object),
        selectedCalendarRepository: expect.any(Object),
        featureRepository: expect.any(Object),
        teamFeatureRepository: expect.any(Object),
        userFeatureRepository: expect.any(Object),
        calendarSyncService: expect.any(Object),
        calendarCacheEventService: expect.any(Object),
      });
    });
  });
});
