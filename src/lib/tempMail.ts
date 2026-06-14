
export interface TempMailMessage {
  id: string;
  from: string;
  subject: string;
  date: string;
}

export interface TempMailDetails extends TempMailMessage {
  body: string;
  textBody: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

export interface GeneratedMailbox {
  email: string;
  token: string;
}

// Local cache to avoid re-fetching identical message contents on every poll
const messageCache: Record<string, TempMailDetails> = {};

/**
 * Simple helper to parse MIME raw email text into human readable components.
 */
function parseMimeEmail(rawMime: string): { from: string; subject: string; date: string; body: string; textBody: string } {
  const lines = rawMime.split(/\r?\n/);
  let headerEndIndex = lines.indexOf("");
  if (headerEndIndex === -1) {
    headerEndIndex = lines.length;
  }

  const headerLines = lines.slice(0, headerEndIndex);
  const bodyText = lines.slice(headerEndIndex + 1).join("\n");

  const headers: Record<string, string> = {};
  let currentKey = "";

  for (const line of headerLines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (currentKey) {
        headers[currentKey] += " " + line.trim();
      }
    } else {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        currentKey = match[1].toLowerCase();
        headers[currentKey] = match[2].trim();
      }
    }
  }

  const from = headers["from"] || "Unknown Sender";
  const subject = headers["subject"] || "No Subject";
  const date = headers["date"] || new Date().toUTCString();

  let body = bodyText;
  let textBody = bodyText;

  if (headers["content-type"]?.includes("multipart")) {
    const boundaryMatch = headers["content-type"].match(/boundary="?([^";\s]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const parts = bodyText.split(`--${boundary}`);

      let htmlPart = "";
      let textPart = "";

      for (const part of parts) {
        if (part.includes("Content-Type: text/html")) {
          const partLines = part.split(/\r?\n/);
          const partHeaderEnd = partLines.indexOf("");
          if (partHeaderEnd !== -1) {
            htmlPart = partLines.slice(partHeaderEnd + 1).join("\n").replace(/--\s*$/, "").trim();
          }
        } else if (part.includes("Content-Type: text/plain")) {
          const partLines = part.split(/\r?\n/);
          const partHeaderEnd = partLines.indexOf("");
          if (partHeaderEnd !== -1) {
            textPart = partLines.slice(partHeaderEnd + 1).join("\n").replace(/--\s*$/, "").trim();
          }
        }
      }

      if (htmlPart) {
        body = htmlPart;
      } else if (textPart) {
        body = textPart;
      }
      textBody = textPart || textBody;
    }
  }

  return { from, subject, date, body, textBody };
}

/**
 * Generate a new random temporary email address and mailbox token using Mail.tm.
 */
export async function generateEmail(): Promise<GeneratedMailbox> {
  try {
    const domainsResponse = await window.fetch("https://api.mail.tm/domains");
    if (!domainsResponse.ok) {
      throw new Error(`Failed to get domains: status ${domainsResponse.status}`);
    }
    const domainsData = await domainsResponse.json();
    if (!domainsData["hydra:member"] || domainsData["hydra:member"].length === 0) {
      throw new Error("No active mail.tm domains found");
    }
    const domain = domainsData["hydra:member"][0].domain;

    const address = Math.random().toString(36).substring(2, 10) + '@' + domain;
    const password = 'rcbrowser123';

    const createResponse = await window.fetch("https://api.mail.tm/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ address, password })
    });
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create account: ${createResponse.status} - ${errorText}`);
    }

    const tokenResponse = await window.fetch("https://api.mail.tm/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ address, password })
    });
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get token: ${tokenResponse.status} - ${errorText}`);
    }
    const tokenData = await tokenResponse.json();
    if (!tokenData.token) {
      throw new Error("No token returned from API");
    }

    return {
      email: address,
      token: tokenData.token
    };
  } catch (error) {
    console.error("Mail.tm API generateEmail error:", error);
    throw error;
  }
}

/**
 * Fetch messages for the specified temporary email mailbox using Mail.tm.
 */
export async function getInbox(name: string, token: string): Promise<TempMailMessage[]> {
  try {
    const url = "https://api.mail.tm/messages";
    const res = await window.fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to get inbox: status ${res.status} ${res.statusText}`);
    }
    const data = await res.json() as any;
    if (!data || !Array.isArray(data["hydra:member"])) {
      return [];
    }

    const messages = data["hydra:member"] as any[];
    return messages.map(msg => {
      const fromAddress = msg.from?.address || "Unknown Sender";
      const fromName = msg.from?.name || "";
      const fromStr = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
      return {
        id: msg.id,
        from: fromStr,
        subject: msg.subject || "No Subject",
        date: msg.createdAt ? new Date(msg.createdAt).toUTCString() : ""
      };
    });
  } catch (error) {
    console.error("Mail.tm API getInbox error:", error);
    return [];
  }
}

/**
 * Fetch details of a specific message using Mail.tm.
 */
export async function getMessageDetails(name: string, token: string, id: string): Promise<TempMailDetails | null> {
  const cacheKey = `${name}:${id}`;
  if (messageCache[cacheKey]) {
    return messageCache[cacheKey];
  }
  try {
    const url = `https://api.mail.tm/messages/${id}`;
    const res = await window.fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to get message details: status ${res.status} ${res.statusText}`);
    }
    const data = await res.json() as any;
    
    const fromAddress = data.from?.address || "Unknown Sender";
    const fromName = data.from?.name || "";
    const fromStr = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    
    const htmlBody = Array.isArray(data.html) ? data.html.join("") : (data.html || data.text || "");
    const textBody = data.text || "";
    
    const details: TempMailDetails = {
      id: data.id,
      from: fromStr,
      subject: data.subject || "No Subject",
      date: data.createdAt ? new Date(data.createdAt).toUTCString() : "",
      body: htmlBody,
      textBody: textBody,
      attachments: Array.isArray(data.attachments) 
        ? data.attachments.map((att: any) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size
          }))
        : []
    };
    
    messageCache[cacheKey] = details;
    return details;
  } catch (error) {
    console.error("Mail.tm API getMessageDetails error:", error, "id:", id);
    return null;
  }
}
