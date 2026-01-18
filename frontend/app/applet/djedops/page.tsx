/**
 * DjedOPS Applet Page - Placeholder for Static Export
 * This is a simplified version for blockchain hosting.
 * The full interactive version requires a server runtime.
 */
'use client';

export default function DjedOPSApplet() {
  return (
    <div className="min-h-screen bg-black text-terminal flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-[#00FF41] mb-4">
          DjedOPS Applet
        </h1>
        <p className="text-lg mb-6">
          This applet requires a dynamic server environment.
        </p>
        <p className="text-gray-400 mb-8">
          Please visit the main dashboard for the full DjedOPS experience.
        </p>
        <a
          href="/"
          className="inline-block bg-[#00FF41] text-black px-6 py-3 rounded-lg font-bold hover:bg-[#00CC33] transition"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
