import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useIsStandalone } from "@calcom/lib/hooks/useIsStandalone";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Logo } from "@calcom/ui/components/logo";
import { SettingsIcon } from "@coss/ui/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { KBarTrigger } from "./Kbar";
import { UserDropdown } from "./user-dropdown/UserDropdown";

export function TopNavContainer() {
  const { status } = useSession();
  const isStandalone = useIsStandalone();
  if (status !== "authenticated" || isStandalone) return null;
  return <TopNav />;
}

function TopNav() {
  const isEmbed = useIsEmbed();
  const { t } = useLocale();
  return (
    <>
      <nav
        style={isEmbed ? { display: "none" } : {}}
        className="sticky top-0 z-40 flex w-full items-center justify-between border-[#e7defc] border-b bg-[#faf8ff]/90 px-4 py-2 backdrop-blur-xl sm:p-4 md:hidden dark:border-[#332653] dark:bg-[#171122]/90">
        <Link href="/event-types">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 self-center">
          <span className="hover:bg-cal-muted hover:text-emphasis text-default group flex items-center rounded-full text-sm font-medium transition lg:hidden">
            <KBarTrigger />
          </span>
          <Link
            href="/settings/my-account/profile"
            className="rounded-full p-2 text-muted transition hover:bg-[var(--wngspan-primary-muted)] hover:text-emphasis focus:outline-none focus:ring-2 focus:ring-[var(--wngspan-primary)] focus:ring-offset-2">
            <span className="sr-only">{t("settings")}</span>
            <SettingsIcon className="h-4 w-4 text-default" />
          </Link>
          <UserDropdown small />
        </div>
      </nav>
    </>
  );
}
