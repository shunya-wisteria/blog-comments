// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Blog comments worker', () => {
	it('returns 404 for paths other than the root', async () => {
		const request = new IncomingRequest('http://example.com/xxx', { method: 'POST' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);

		expect(response.status).toBe(404);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(await response.json()).toEqual({
			status: 'E',
			code: '4040',
			msg: 'Not Found',
		});
	});

	it('treats a root path with a query string as the root', async () => {
		const request = new IncomingRequest('http://example.com/?entry=test-entry');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		const body = await response.json<{ res: { entryId: string } }>();

		expect(response.status).toBe(200);
		expect(body.res.entryId).toBe('test-entry');
	});

	it('responds to the root (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({});
	});

	it('responds to the root (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({});
	});
});
