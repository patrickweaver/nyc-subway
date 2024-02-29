export type ApiResponseError = {
    message: string;
}

export type ApiResponseBody = {
    message: string;
    success: boolean;
    error: ApiResponseError | null;
    data: unknown | null;
}

export const LineGroup = {
    ACE: "ace",
	BDFM: "bdfm",
	G: "g",
	JZ: "jz",
	NQRW: "nqrw",
	L: "l",
	ONE_TWO_THREE_FOUR_FIVE_SIX_GS: "123456",
	SEVEN: "7",
	SIR: "si"
}