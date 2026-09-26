export function average(numbers: number[]): number {
	if (numbers.length === 0) {
		throw new Error('Cannot calculate average of an empty array');
	}
	const sum = numbers.reduce((acc, curr) => acc + curr, 0);
	return sum / numbers.length;
}

export function sum(numbers: number[]): number {
	if (numbers.length === 0) {
		throw new Error('Cannot calculate sum of an empty array');
	}
	return numbers.reduce((acc, curr) => acc + curr, 0);
}

export function min(numbers: number[]): number {
	if (numbers.length === 0) {
		throw new Error('Cannot calculate min of an empty array');
	}
	return Math.min(...numbers);
}

export function max(numbers: number[]): number {
	if (numbers.length === 0) {
		throw new Error('Cannot calculate max of an empty array');
	}
	return Math.max(...numbers);
}
