import type { RequestHandler } from './$types'
import { isErrorWithMessage } from '$lib'
import type { ApiResponseBody } from '$lib/types'

export const GET: RequestHandler = () => {
	try {
		const responseBody: ApiResponseBody = {
			message: 'NYC Subway',
			success: true,
			error: null,
			data: null
		}

		return new Response(JSON.stringify(responseBody));
	} catch (_error) {
		const errorMesssage = isErrorWithMessage(_error) ? _error.message : 'Unknown error';
		const errorResponseBody = {
			message: errorMesssage,
			success: false,
			error: {
				message: errorMesssage
			},
			data: null
		}
		return new Response(JSON.stringify(errorResponseBody))
	}
}