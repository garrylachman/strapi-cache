import { Context } from 'koa';
import { generateCacheKey } from '../utils/key';
import { CacheService } from '../../src/types/cache.types';
import { loggy } from '../utils/log';
import Stream, { Readable } from 'stream';

import { decodeBufferToText, decompressBuffer, streamToBuffer } from '../utils/body';
import { getCacheHeaderConfig, getHeadersToStore } from '../utils/header';
import rawBody from 'raw-body';

const middleware = async (ctx: Context, next: any) => {
  const cacheService = strapi.plugin('strapi-cache').services.service as CacheService;
  const cacheableRoutes = strapi.plugin('strapi-cache').config('cacheableRoutes') as string[];
  const { cacheHeaders, cacheHeadersDenyList, cacheHeadersAllowList, cacheAuthorizedRequests } =
    getCacheHeaderConfig();
  const cacheStore = cacheService.getCacheInstance();
  const { url } = ctx.request;

  let body = '';

  try {
    const originalReq = ctx.req;
    const bodyBuffer = await rawBody(originalReq);
    body = bodyBuffer.toString();

    const clonedReq = new Readable();
    clonedReq.push(bodyBuffer);
    clonedReq.push(null);

    (clonedReq as any).headers = { ...originalReq.headers };
    (clonedReq as any).method = originalReq.method;
    (clonedReq as any).url = originalReq.url;
    (clonedReq as any).httpVersion = originalReq.httpVersion;
    (clonedReq as any).socket = originalReq.socket;
    (clonedReq as any).connection = originalReq.connection;

    ctx.req = clonedReq as any;
    ctx.request.req = clonedReq as any;
  } catch (error) {}

  const key = generateCacheKey(ctx, body);
  const cacheEntry = await cacheStore.get(key);
  const cacheControlHeader = ctx.request.headers['cache-control'];
  const noCache = cacheControlHeader && cacheControlHeader.includes('no-cache');
  const routeIsCachable =
    cacheableRoutes.some((route) => url.startsWith(route)) ||
    (cacheableRoutes.length === 0 && url.startsWith('/api'));
  const authorizationHeader = ctx.request.headers['authorization'];

  if (authorizationHeader && !cacheAuthorizedRequests) {
    loggy.info(`Authorized request bypassing cache: ${key}`);
    await next();
    return;
  }

  if (cacheEntry && !noCache) {
    loggy.info(`HIT with key: ${key}`);
    ctx.status = 200;
    ctx.body = cacheEntry.body;
    if (cacheHeaders) {
      ctx.set(cacheEntry.headers);
    }
    return;
  }

  await next();

  if (
    (ctx.method === 'GET' || ctx.method === 'POST') &&
    ctx.status >= 200 &&
    ctx.status < 300 &&
    routeIsCachable
  ) {
    loggy.info(`MISS with key: ${key}`);
    const headersToStore = getHeadersToStore(
      ctx,
      cacheHeaders,
      cacheHeadersAllowList,
      cacheHeadersDenyList
    );

    if (ctx.body instanceof Stream) {
      const buf = await streamToBuffer(ctx.body);
      const contentEncoding = ctx.response.headers['content-encoding'];
      const decompressed = await decompressBuffer(buf, contentEncoding);
      const responseText = decodeBufferToText(decompressed);

      await cacheStore.set(key, { body: responseText, headers: headersToStore });
      ctx.body = buf;
    } else {
      await cacheStore.set(key, { body: ctx.body, headers: headersToStore });
    }
  }
};

export default middleware;
