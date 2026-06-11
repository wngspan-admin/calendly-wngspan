export async function getGettingStartedPath(): Promise<string> {
  return "/onboarding/personal/settings";
}

export async function getGettingStartedPathWhenInvited(): Promise<string> {
  return "/onboarding/personal/settings";
}

export async function getGettingStartedPathWithParams(queryParams?: Record<string, string>): Promise<string> {
  const basePath = await getGettingStartedPath();

  if (!queryParams || Object.keys(queryParams).length === 0) {
    return basePath;
  }

  const params = new URLSearchParams(queryParams);
  return `${basePath}?${params.toString()}`;
}
