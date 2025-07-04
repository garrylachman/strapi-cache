declare const _default: {
    default: ({ env }: {
        env: any;
    }) => {
        debug: boolean;
        max: number;
        ttl: number;
        size: number;
        allowStale: boolean;
        cacheableRoutes: any[];
        provider: string;
        redisConfig: any;
        redisClusterNodes: any[];
        redisClusterOptions: {};
        cacheHeaders: boolean;
        cacheHeadersDenyList: any[];
        cacheHeadersAllowList: any[];
        cacheAuthorizedRequests: boolean;
        cacheGetTimeoutInMs: number;
        autoPurgeCache: boolean;
    };
    validator: (config: any) => void;
};
export default _default;
