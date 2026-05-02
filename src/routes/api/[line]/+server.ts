import type { RequestHandler } from './$types';
import { isErrorWithMessage, isZodValidationError } from '$lib';
import { type ApiResponseBody, type NYCSU_Entity } from '$lib/types';
import { LineGroupEnum } from '$lib/validation';
import { getNYCSU_Entity } from '$lib/mtaApi';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const requestTime = new Date().getTime();
		const line = LineGroupEnum.parse(params.line);
		const _tripData = await getNYCSU_Entity(line);
		// TODO don't filter out items almost at last stop
		const tripData = _tripData.filter((i: NYCSU_Entity) => !!i.updates_next_stop_id);
		const count = tripData.length;
		const data = { entities: tripData, entity_count: count };
		const responseBody: ApiResponseBody = {
			message: 'NYC Subway',
			success: true,
			error: null,
			request_time: requestTime,
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
