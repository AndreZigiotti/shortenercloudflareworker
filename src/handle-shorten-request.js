import { invalidPaths } from './constants';
import { formatExpirationTime } from './utils/format-expiration-time';
import { generateUniqueKey } from './utils/generate-unique-key';
import { generateRandomKey } from './utils/generate-random-key';

export async function handleShortenRequest(request) {
	const params = await request.json();
	const length = params.shortUrlLength;
	const url = params.shortUrl;

	let key;

	if(url === null || url === '') {
		key = generateRandomKey(length);

		let value = await BD_ID.get(key);

		while(value !== null) {
			key = generateRandomKey(length);
			value = await BD_ID.get(key);
		}

		key = `url:${key}`;
	} else {
		if(invalidPaths.includes(url)) {
			return new Response('Invalid path because of conflict!', { status: 400 });
		}

		key = `url:${url}`;

		const value = await BD_ID.get(key);

		if(value !== null && JSON.parse(value).longUrl !== params.longUrl) {
			return new Response('The shortUrl has been used!', { status: 400 });
		}

		const oldShortUrl = params.oldShortUrl;
		const oldUrlKey = `url:${oldShortUrl}`;
		const oldUrlValue = await BD_ID.get(oldUrlKey);

		if(url !== oldShortUrl && oldUrlValue !== null) {
			await BD_ID.delete(oldUrlKey);
		}
	}

	const expirationTime = params.expirationTime;

	const data = {
		expirationTime: expirationTime == 0 ? 0 : formatExpirationTime(expirationTime),
		requirePassword: params.requirePassword,
		password: params.password,
		shortUrlLength: length,
		longUrl: params.longUrl,
		referrer: request.headers.get('Referer'),
		clicks: {},
		id: params.id || generateUniqueKey(),
	};

	if(data.expirationTime == 0) {
    await BD_ID.put(key, JSON.stringify(data));
	} else {
		await BD_ID.put(key, JSON.stringify(data), {
			expirationTtl: (expirationTime || 1) * 60 * 1000,
		});
	}

	const result = {
		status: 200,
		shortUrl: key.split(':')[1],
		...data,
	};

	return new Response(JSON.stringify(result), { status: 200 });
}