/**
 * Filter out annoying Clerk headers warnings in development
 * These are harmless and come from Clerk's internal code
 */

if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Filter out the specific Clerk headers warning
    const errorString = args.join(' ');
    if (
      errorString.includes('headers()` should be awaited') ||
      errorString.includes('sync-dynamic-apis') ||
      errorString.includes('createHeadersAccessError')
    ) {
      // Silently ignore these warnings
      return;
    }
    // Show all other errors normally
    originalError.apply(console, args);
  };
}
