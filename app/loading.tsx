import { PageLoader } from '@/components/PageLoader';

// Next.js automatically wraps every route segment in a Suspense boundary
// using the nearest loading.tsx up the tree, and shows it the instant a
// navigation starts — before the destination page's own code has even run.
// This is what covers the gap between "user clicked a link" and "the new
// page's first render", which no amount of in-page loading state can catch
// since that state doesn't exist yet.
export default function Loading() {
  return <PageLoader />;
}
