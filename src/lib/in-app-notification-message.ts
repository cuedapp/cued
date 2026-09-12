export function notificationMessageValues(
  category: string,
  message: string,
  details: Record<string, string> | null | undefined,
  fallbackPerson: string,
) {
  if (category.startsWith("request.") || category.startsWith("follow.") || category.startsWith("strm.")) {
    return { title: message, person: details?.person ?? fallbackPerson };
  }
  return undefined;
}
