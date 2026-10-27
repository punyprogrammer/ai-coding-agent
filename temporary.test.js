const { add, checkPrime } = require('./temporary');

describe('add function', () => {
  test('should add two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('should add two negative numbers', () => {
    expect(add(-5, -3)).toBe(-8);
  });

  test('should add positive and negative numbers', () => {
    expect(add(10, -5)).toBe(5);
  });

  test('should add zero and a number', () => {
    expect(add(0, 5)).toBe(5);
  });

  test('should add two zeros', () => {
    expect(add(0, 0)).toBe(0);
  });

  test('should add decimal numbers', () => {
    expect(add(1.5, 2.5)).toBe(4);
  });

  test('should add large numbers', () => {
    expect(add(1000000, 2000000)).toBe(3000000);
  });

  test('should handle floating point precision', () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3, 5);
  });
});

describe('checkPrime function', () => {
  test('should return true for prime number 2', () => {
    expect(checkPrime(2)).toBe(true);
  });

  test('should return true for prime number 3', () => {
    expect(checkPrime(3)).toBe(true);
  });

  test('should return true for prime number 5', () => {
    expect(checkPrime(5)).toBe(true);
  });

  test('should return true for prime number 7', () => {
    expect(checkPrime(7)).toBe(true);
  });

  test('should return true for prime number 13', () => {
    expect(checkPrime(13)).toBe(true);
  });

  test('should return true for prime number 97', () => {
    expect(checkPrime(97)).toBe(true);
  });

  test('should return false for 0', () => {
    expect(checkPrime(0)).toBe(false);
  });

  test('should return false for 1', () => {
    expect(checkPrime(1)).toBe(false);
  });

  test('should return false for negative number -5', () => {
    expect(checkPrime(-5)).toBe(false);
  });

  test('should return false for even number 4', () => {
    expect(checkPrime(4)).toBe(false);
  });

  test('should return false for even number 100', () => {
    expect(checkPrime(100)).toBe(false);
  });

  test('should return false for composite number 15', () => {
    expect(checkPrime(15)).toBe(false);
  });

  test('should return false for composite number 21', () => {
    expect(checkPrime(21)).toBe(false);
  });

  test('should return false for composite number 91', () => {
    expect(checkPrime(91)).toBe(false);
  });

  test('should throw error for non-integer input', () => {
    expect(() => checkPrime(5.5)).toThrow('Input must be an integer');
  });

  test('should throw error for string input', () => {
    expect(() => checkPrime('5')).toThrow('Input must be an integer');
  });

  test('should throw error for null input', () => {
    expect(() => checkPrime(null)).toThrow('Input must be an integer');
  });

  test('should throw error for undefined input', () => {
    expect(() => checkPrime(undefined)).toThrow('Input must be an integer');
  });

  test('should return true for large prime number 1009', () => {
    expect(checkPrime(1009)).toBe(true);
  });
});
