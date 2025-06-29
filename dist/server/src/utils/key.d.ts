import { Context } from 'koa';
export declare const generateCacheKey: (context: Context, body?: string) => string;
export declare const generateGraphqlCacheKey: (payload: string) => string;
