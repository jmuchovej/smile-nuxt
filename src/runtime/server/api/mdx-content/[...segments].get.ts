import type { H3Event } from "h3";
import { extname } from "pathe";
import { createError, setResponseStatus, setResponseHeaders, defineEventHandler, useStorage, useRuntimeConfig, getRouterParam } from "#imports";

export default defineEventHandler(async (event: H3Event) => {
  // For catch-all routes, the parameter is an array
  const segments = getRouterParam(event, "segments");
  if (!segments) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing `segments` parameter'
    });
  }

  const fullpath = [segments].flat().join("/");
  const path = fullpath.replace(extname(fullpath), "");

  // Get the MDX processor from runtime config or storage
  const config = useRuntimeConfig();
  const storage = useStorage("smile:mdx");

  try {
    // Try to get processed content from storage
    const processed = await storage.getItem(`content:${path}`);

    if (!processed) {
      console.log(`MDX content not found in storage for path: ${path}`);
      throw createError({
        statusCode: 404,
        message: `MDX content not found: ${path}`,
        debug: {
          requestedPath: path,
          storageKey: `content:${path}`,
          availableKeys: await storage.getKeys()
        }
      });
    }

    console.log('MDX content found:', typeof processed);
    console.log('First 200 chars:', typeof processed === 'string' ? processed.substring(0, 200) : JSON.stringify(processed).substring(0, 200));

    // Set response headers to ensure JSON
    setResponseHeaders(event, {
      "content-type": "application/json;charset=utf-8",
    });
    setResponseStatus(event, 200, `Successfully found ${path} as parsed MDX content!`);

    // Ensure we're returning a proper JSON response
    return processed;
  } catch (error) {
    console.error('MDX API Error:', error);
    throw createError({
      statusCode: 500,
      message: `Failed to load MDX content: ${error}`,
      stack: error.stack
    });
  }
});
