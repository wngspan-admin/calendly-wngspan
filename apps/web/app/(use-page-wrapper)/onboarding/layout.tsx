import { redirect } from "next/navigation";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  redirect("/onboarding/personal/settings");

  return <>{children}</>;
}
