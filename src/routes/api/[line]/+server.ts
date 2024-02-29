import type { RequestHandler } from './$types'
import { isErrorWithMessage, isZodValidationError } from '$lib'
import { type ApiResponseBody } from '$lib/types'
import { LineGroupEnum } from '$lib/validation'

import { MTA_API_KEY, TIMEZONE, UPDATE_FREQUENCY_IN_SECONDS } from '$env/static/private'

if (
	!MTA_API_KEY ||
	!TIMEZONE ||
	!UPDATE_FREQUENCY_IN_SECONDS
	) {
	console.log("Fatal Error: Missing ENV variable.");
	process.exit();
}

export const GET: RequestHandler = ({ params }) => {
    try {
        const requestTime = new Date().getTime();
        const line = LineGroupEnum.parse(params.line)
        const data = {
            requestTime,
            line
        }
		const responseBody: ApiResponseBody = {
			message: 'NYC Subway',
			success: true,
			error: null,
			data
		}

		return new Response(JSON.stringify(responseBody));
	} catch (_error: unknown) {
		let errorMessage = "Server error"
		if (isZodValidationError(_error)) {
			errorMessage = _error.issues[0].message
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
		}
		return new Response(JSON.stringify(errorResponseBody))
	}
}