// Test helper to modify test behavior in CI environment
const isCI = process.env.CI === "true";

// Reduce the number of blocks to move in CI
const ciBlockMultiplier = isCI ? 0.1 : 1; // Only move 10% of blocks in CI

// Export functions that will be used in tests
module.exports = {
  isCI,
  ciBlockMultiplier,
  
  // Helper function to adjust values for CI
  adjustForCI: (value) => {
    if (isCI) {
      return Math.max(1, Math.floor(value * ciBlockMultiplier));
    }
    return value;
  }
}; 