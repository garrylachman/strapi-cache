import { createHash } from 'crypto';
import { Context } from 'koa';

export const generateCacheKey = (context: Context, body: string = '') => {
  const { url } = context.request;
  const { method } = context.request;

  const hash = createHash('sha256').update(body).digest('base64url');

  return `${method}:${url}:${hash}`;
};

export const generateGraphqlCacheKey = (payload: string) => {
  const hash = createHash('sha256').update(payload).digest('base64url');
  return `POST:/graphql:${hash}`;
};
