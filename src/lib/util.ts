function randomTripId(): string {
	return `unknown_${String(Math.random()).slice(2, 6)}`;
}
