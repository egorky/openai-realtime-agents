import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Error in /session: OPENAI_API_KEY is not set in the environment.");
      return NextResponse.json(
        { error: "Server configuration error: OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
          // You could add other session parameters here if needed
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // If OpenAI API returned an error (e.g., 401, 403, 429)
      console.error(`Error in /session: OpenAI API responded with status ${response.status}`, data);
      return NextResponse.json(
        {
          error: "Failed to create session with OpenAI.",
          details: data.error || data // Return OpenAI's error details if available
        },
        { status: response.status } // Forward OpenAI's status code
      );
    }

    if (!data.client_secret?.value) {
      // This case means OpenAI responded with 200 OK, but the expected field is missing.
      // This is less likely if the API call was successful with a valid key.
      console.error("Error in /session: 'client_secret.value' not found in OpenAI response.", data);
      return NextResponse.json(
        { error: "Unexpected response structure from OpenAI." , details: data },
        { status: 500 }
      );
    }

    // Successfully got the client_secret
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Critical error in /session endpoint:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || "An unknown error occurred." },
      { status: 500 }
    );
  }
}
