/**
 * Server wrapper — reads the Auth.js session and passes it to the client
 * Navbar component.  This file is imported by layout.tsx (server component).
 */
import { auth } from '@/lib/auth';
import Navbar from './Navbar';

export default async function NavbarServer() {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;
  return <Navbar user={user} />;
}
