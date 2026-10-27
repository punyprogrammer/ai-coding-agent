// Function to add two numbers
function add(a, b) {
  return a + b;
}

// Function to check if a number is prime
function checkPrime(num) {
  // Handle edge cases
  if (typeof num !== 'number' || !Number.isInteger(num)) {
    throw new Error('Input must be an integer');
  }
  
  if (num <= 1) {
    return false;
  }
  
  if (num === 2) {
    return true;
  }
  
  if (num % 2 === 0) {
    return false;
  }
  
  // Check odd divisors up to square root of num
  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) {
      return false;
    }
  }
  
  return true;
}

module.exports = { add, checkPrime };
