import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ScheduleMeetingPage() {
  const { userId } = await auth();

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect('/sign-in');
  }

  // Redirect to new teacher selection flow
  redirect('/student/meetings/select-teacher');
}
