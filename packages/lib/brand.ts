export const WNGSPAN_BRAND = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "WNGSPAN",
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "WNGSPAN",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS || "support@wngspan.com",
  senderId: process.env.NEXT_PUBLIC_SENDER_ID || "WNGSPAN",
  senderName: process.env.NEXT_PUBLIC_SENDGRID_SENDER_NAME || "WNGSPAN",
  websiteUrl: process.env.NEXT_PUBLIC_WEBSITE_URL || "https://wngspan.com",
  description: "Scheduling infrastructure for intentional teams.",
  colors: {
    primary: "#2B007A",
    primaryEmphasis: "#1A004A",
    primaryMuted: "#EDE7FF",
    primaryText: "#FFFFFF",
    darkPrimary: "#D8C7FF",
    darkPrimaryEmphasis: "#F4F0FF",
    darkPrimaryText: "#160033",
  },
  logos: {
    wordmark: "/wngspan-logo.svg",
    wordmarkDark: "/wngspan-logo-dark.svg",
    icon: "/wngspan-icon.svg",
  },
} as const;
