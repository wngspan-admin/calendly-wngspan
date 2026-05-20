import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockCalendarSubscriptionService,
  mockCalendarSubscriptionServiceInstance,
} = vi.hoisted(() => {
  const mockCalendarSubscriptionServiceInstance = {
    isCacheEnabled: vi.fn(),
    isSyncEnabled: vi.fn(),
    checkForNewSubscriptions: vi.fn(),
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
      this.method = options.method || "GET";
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
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));
vi.mock("@calcom/web/app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: vi.fn((handler) => handler),
}));

describe("/api/cron/calendar-subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_API_KEY", "test-cron-key");
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mockCalendarSubscriptionServiceInstance.isCacheEnabled.mockResolvedValue(true);
    mockCalendarSubscriptionServiceInstance.isSyncEnabled.mockResolvedValue(true);
    mockCalendarSubscriptionServiceInstance.checkForNewSubscriptions.mockResolvedValue(undefined);
  });

  describe("Authentication", () => {
    test("should return 403 when no API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");

      const { GET } = await import("../route");
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toBe("Forbiden");
    });

    test("should return 403 when invalid API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "invalid-key");

      const { GET } = await import("../route");
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toBe("Forbiden");
    });

    test("should accept valid API key", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Feature flag checks", () => {
    test("should return early when cache AND sync are disabled", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");
      mockCalendarSubscriptionServiceInstance.isCacheEnabled.mockResolvedValue(false);
      mockCalendarSubscriptionServiceInstance.isSyncEnabled.mockResolvedValue(false);

      const { GET } = await import("../route");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(mockCalendarSubscriptionServiceInstance.checkForNewSubscriptions).not.toHaveBeenCalled();
    });

    test("should proceed when both cache and sync are enabled", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(mockCalendarSubscriptionServiceInstance.checkForNewSubscriptions).toHaveBeenCalledOnce();
    });
  });

  describe("Subscription checking functionality", () => {
    test("should successfully check for new subscriptions", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(mockCalendarSubscriptionServiceInstance.checkForNewSubscriptions).toHaveBeenCalledOnce();
    });

    test("should handle subscription checking errors gracefully", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");
      mockCalendarSubscriptionServiceInstance.checkForNewSubscriptions.mockRejectedValue(
        new Error("Subscription service unavailable")
      );

      const { GET } = await import("../route");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Subscription service unavailable");
    });

    test("should handle non-Error exceptions", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");
      mockCalendarSubscriptionServiceInstance.checkForNewSubscriptions.mockRejectedValue("String error");

      const { GET } = await import("../route");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Unknown error");
    });
  });

  describe("Service instantiation", () => {
    test("should instantiate all services with correct dependencies", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      await GET(request);

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
