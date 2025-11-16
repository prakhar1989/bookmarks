import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export interface ExtractedContent {
  title: string | null;
  metaDescription: string | null;
  textContent: string | null;
  faviconUrl: string | null;
  sourceType: string;
}

/**
 * Fetches HTML content from a URL with timeout and size limits
 */
export async function fetchPageHtml(
  url: string,
  timeoutMs: number = 10000,
  maxSizeBytes: number = 2 * 1024 * 1024, // 2MB
): Promise<string | null> {
  console.log("[ContentExtractor] Starting to fetch HTML", {
    url,
    timeoutMs,
    maxSizeBytes,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BookmarkBot/1.0; +https://example.com/bot)",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    console.log("[ContentExtractor] Received HTTP response", {
      url,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    if (!response.ok) {
      console.error("[ContentExtractor] HTTP request failed", {
        url,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      console.error("[ContentExtractor] Invalid content type", {
        url,
        contentType,
        expected: "text/html",
      });
      throw new Error(`Invalid content type: ${contentType}`);
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      console.error("[ContentExtractor] Content too large", {
        url,
        contentLength: parseInt(contentLength),
        maxSizeBytes,
      });
      throw new Error(`Content too large: ${contentLength} bytes`);
    }

    const html = await response.text();

    // Double-check size after download
    if (html.length > maxSizeBytes) {
      console.warn("[ContentExtractor] HTML exceeded max size, truncating", {
        url,
        actualSize: html.length,
        maxSizeBytes,
        truncatedTo: maxSizeBytes,
      });
      return html.substring(0, maxSizeBytes);
    }

    console.log("[ContentExtractor] Successfully fetched HTML", {
      url,
      htmlLength: html.length,
    });

    return html;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("[ContentExtractor] Request timeout", {
          url,
          timeoutMs,
        });
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      console.error("[ContentExtractor] Error fetching page", {
        url,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      throw error;
    }
    console.error("[ContentExtractor] Unknown error fetching page", { url });
    throw new Error("Unknown error fetching page");
  }
}

/**
 * Extracts readable content from HTML using Mozilla Readability
 */
export function extractReadableContent(
  html: string,
  url: string,
): ExtractedContent {
  console.log("[ContentExtractor] Starting content extraction", {
    url,
    htmlLength: html.length,
  });

  try {
    const { document } = parseHTML(html);

    // Extract metadata
    const metaDescription =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ||
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content") ||
      null;

    console.log("[ContentExtractor] Extracted metadata", {
      url,
      title: document.title,
      hasMetaDescription: !!metaDescription,
    });

    // Extract favicon
    let faviconUrl: string | null = null;
    const faviconLink =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (faviconLink?.href) {
      faviconUrl = new URL(faviconLink.href, url).href;
      console.log("[ContentExtractor] Found favicon", { url, faviconUrl });
    } else {
      console.log("[ContentExtractor] No favicon found", { url });
    }

    // Detect source type
    let sourceType = "article";
    const ogType = document
      .querySelector('meta[property="og:type"]')
      ?.getAttribute("content");
    if (ogType) {
      sourceType = ogType;
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      sourceType = "video";
    } else if (url.includes("twitter.com") || url.includes("x.com")) {
      sourceType = "tweet";
    }

    console.log("[ContentExtractor] Detected source type", {
      url,
      sourceType,
      ogType,
    });

    // Use Readability to extract main content
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      console.warn(
        "[ContentExtractor] Readability failed to parse article content",
        {
          url,
          fallbackTitle: document.title,
          hasMetaDescription: !!metaDescription,
        },
      );

      // Readability failed, try to get basic info
      return {
        title: document.title || null,
        metaDescription,
        textContent: null,
        faviconUrl,
        sourceType,
      };
    }

    console.log("[ContentExtractor] Readability successfully parsed article", {
      url,
      articleTitle: article.title,
      contentLength: article.content?.length || 0,
      excerpt: article.excerpt,
    });

    // Convert HTML content to plain text
    const { document: contentDoc } = parseHTML(article.content || "");
    const textContent = contentDoc.body.textContent || "";

    const result = {
      title: article.title || document.title || null,
      metaDescription,
      textContent: textContent.trim(),
      faviconUrl,
      sourceType,
    };

    console.log("[ContentExtractor] Successfully extracted content", {
      url,
      title: result.title,
      textContentLength: result.textContent?.length || 0,
      hasMetaDescription: !!result.metaDescription,
      hasFavicon: !!result.faviconUrl,
      sourceType: result.sourceType,
    });

    return result;
  } catch (error) {
    console.error("[ContentExtractor] Error extracting content", {
      url,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error(
      `Failed to extract content: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Main function to fetch and extract content from a URL
 */
export async function fetchAndExtractContent(
  url: string,
): Promise<ExtractedContent> {
  console.log("[ContentExtractor] Starting fetchAndExtractContent", { url });

  try {
    const html = await fetchPageHtml(url);

    if (!html) {
      console.error("[ContentExtractor] No HTML content returned", { url });
      throw new Error("Failed to fetch HTML content");
    }

    const result = await extractReadableContent(html, url);

    console.log("[ContentExtractor] Completed fetchAndExtractContent", {
      url,
      result,
      success: true,
    });

    return result;
  } catch (error) {
    console.error(
      "[ContentExtractor] fetchAndExtractContent failed completely",
      {
        url,
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    );
    throw error;
  }
}
