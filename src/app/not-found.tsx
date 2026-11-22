import Image from "next/image";
import logo from "@/assets/brand/logo.png";

export default function NotFound() {
  return (
    <main className="on-dark relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-noir px-4 text-center text-[#fde7f5]">
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 -z-10 size-[30rem] -translate-x-1/2 rounded-full bg-neon/20 blur-[120px]" />
      <Image src={logo} alt="Sedosa Beauty Studio" sizes="18rem" className="h-auto w-72" />
      <h1 className="mt-8 text-3xl font-semibold text-white">This page isn&apos;t here</h1>
      <p className="mt-2 max-w-sm text-[#f3d6e8]">
        The link may be old or mistyped. If you were looking for your appointment, use the link in your confirmation email.
      </p>
      <a href="/#services" className="btn-neon mt-8 px-7 py-3.5">
        Book an appointment
      </a>
    </main>
  );
}
