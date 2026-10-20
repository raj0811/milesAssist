
import {
    Injectable,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    private readonly redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => Math.min(times * 500, 3000),
    });

    constructor() {
        this.redis.on('error', (error) => {
            this.logger.error(`Redis connection error: ${error.message}`);
        });

        this.redis.connect().catch((error: Error) => {
            this.logger.error(`Redis connection failed: ${error.message}`);
        });
    }

    async get<T = unknown>(key: string): Promise<T | null> {
        const value = await this.redis.get(key);

        if (value === null) {
            return null;
        }

        return JSON.parse(value) as T;
    }

    async set(
        key: string,
        value: unknown,
        ttl = 300,
    ): Promise<void> {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async delPattern(pattern: string): Promise<void> {
        let cursor = '0';

        do {
            const [nextCursor, keys] = await this.redis.scan(
                cursor,
                'MATCH',
                pattern,
                'COUNT',
                100,
            );

            cursor = nextCursor;

            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } while (cursor !== '0');
    }

    async onModuleDestroy(): Promise<void> {
        if (this.redis.status === 'ready') {
            await this.redis.quit();
        } else {
            this.redis.disconnect();
        }
    }
}
