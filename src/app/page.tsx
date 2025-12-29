
import { CountdownTimer } from '@/components/countdown-timer';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <CountdownTimer />
    </main>
  );
}
