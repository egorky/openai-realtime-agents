import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 p-6">
      <div className="bg-white shadow-xl rounded-lg p-10 max-w-md text-center">
        <Image
          src="/openai-logomark.svg" // Assuming this is still in /public
          alt="OpenAI Logo"
          width={60}
          height={60}
          className="mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold mb-6 text-gray-700">Realtime Voice Agent Portal</h1>
        <p className="mb-8 text-gray-600">
          Welcome! Please select your view:
        </p>
        <div className="space-y-4">
          <Link href="/client" legacyBehavior>
            <a className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition duration-150 ease-in-out">
              Go to Client View
            </a>
          </Link>
          <Link href="/supervisor" legacyBehavior>
            <a className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition duration-150 ease-in-out">
              Go to Supervisor View
            </a>
          </Link>
        </div>
        <p className="mt-8 text-sm text-gray-500">
          Ensure your environment is configured correctly, including any necessary API keys and HTTPS certificates for local development.
        </p>
      </div>
    </div>
  );
}
