import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConfigurationProfileRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/teams/${slug}`);
}
