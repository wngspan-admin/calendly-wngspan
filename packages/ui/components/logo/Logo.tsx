import classNames from "@calcom/ui/classNames";

export function Logo({
  small,
  icon,
  inline = true,
  className,
  src,
}: {
  small?: boolean;
  icon?: boolean;
  inline?: boolean;
  className?: string;
  src?: string;
}) {
  const isCustomSrc = !!src;
  const logoSrc = src ?? "/api/logo";

  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <img
            className="mx-auto w-9"
            alt="WNGSPAN"
            title="WNGSPAN"
            src={isCustomSrc ? `${logoSrc}?type=icon` : "/wngspan-icon-source.jpg"}
          />
        ) : isCustomSrc ? (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto")}
            alt="WNGSPAN"
            title="WNGSPAN"
            src={logoSrc}
          />
        ) : (
          <>
            <img
              className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:hidden")}
              alt="WNGSPAN"
              title="WNGSPAN"
              src="/wngspan-logo.png"
            />
            <img
              className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "hidden dark:block")}
              alt="WNGSPAN"
              title="WNGSPAN"
              src="/wngspan-logo-white.png"
            />
          </>
        )}
      </strong>
    </h3>
  );
}
