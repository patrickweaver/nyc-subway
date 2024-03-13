import type { RequestHandler } from './$types';
import { isErrorWithMessage, isZodValidationError } from '$lib';
import { type ApiResponseBody } from '$lib/types';
import { LineGroupEnum } from '$lib/validation';
import { getParsedTripData } from '$lib/mtaApi';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const requestTime = new Date().getTime();
		const line = LineGroupEnum.parse(params.line);
		const feedData = await getParsedTripData(line);
		const data = {
			requestTime,
			line,
			feedData,
			count: feedData.length
		};
		const responseBody: ApiResponseBody = {
			message: 'NYC Subway',
			success: true,
			error: null,
			data
		};

		return new Response(JSON.stringify(responseBody));
	} catch (_error: unknown) {
		console.log({ _error });
		let errorMessage = 'Server error';
		if (isZodValidationError(_error)) {
			errorMessage = _error.issues[0].message;
		} else if (isErrorWithMessage(_error)) {
			errorMessage = _error.message;
		}
		const errorResponseBody = {
			message: errorMessage,
			success: false,
			error: {
				message: errorMessage
			},
			data: null
		};
		return new Response(JSON.stringify(errorResponseBody));
	}
};
