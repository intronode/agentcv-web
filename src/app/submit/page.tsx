// /submit is a legacy route — permanently redirect to /register/team.
// The old SubmitPageClient is preserved as reference; this page is no longer rendered.
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function SubmitPage() {
  redirect('/register/team');
}
