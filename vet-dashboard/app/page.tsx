import { redirect } from 'next/navigation';

// ponytail: root → /bookings; Tasks 5-7 add the actual pages
export default function Home() {
  redirect('/bookings');
}
