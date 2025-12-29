const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID!;

interface AddContactOptions {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  attributes?: Record<string, string | number>;
}

export async function addContactToBrevo({
  email,
  firstName,
  lastName,
  phone,
  attributes = {},
}: AddContactOptions) {
  const response = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        SMS: phone,
        ...attributes,
      },
      listIds: [parseInt(BREVO_LIST_ID)],
      updateEnabled: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Brevo API error:", data);
    throw new Error(`Brevo API error: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function getContact(email: string) {
  const response = await fetch(
    `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
    {
      headers: {
        "api-key": BREVO_API_KEY,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  return response.json();
}
