import Wordmark from "@/components/landing/Wordmark";

export default function NotFound() {
  return (
    <main className="on-rose lacquer flex min-h-screen flex-col items-center justify-center px-4 text-center text-oxblood">
      <Wordmark businessName="Sedosa Beauty Studio" size="lg" />
      <h1 className="font-display mt-10 text-[clamp(2.4rem,8vw,3.6rem)] font-medium leading-[1.02]">This page isn&apos;t here</h1>
      <p className="mt-4 max-w-sm text-lg">
        The link may be old or mistyped. If you were looking for your appointment, use the link in your confirmation email.
      </p>
      <a href="/#services" className="btn-primary mt-8">
        Book an appointment
      </a>
    </main>
  );
}
