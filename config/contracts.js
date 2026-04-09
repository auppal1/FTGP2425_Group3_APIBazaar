module.exports = {
  async getCurrentDayBalance(address) {
    console.log('[stub] getCurrentDayBalance', address);
    return 1n; // act like everyone has 1 token
  },
  async consumeTokens(address, amount) {
    console.log('[stub] consumeTokens', address, amount);
    return { wait: async () => {} }; // pretend tx succeeded
  }
};
