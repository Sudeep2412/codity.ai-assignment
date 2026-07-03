module.exports = async function simulationHandler(payload, signal) {
  const duration = payload.durationMs || Math.floor(Math.random() * 2000) + 500;
  const shouldFail = payload.failProbability && Math.random() < payload.failProbability;
  
  return new Promise((resolve, reject) => {
    // If already aborted, reject immediately
    if (signal && signal.aborted) {
      return reject(signal.reason);
    }

    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      
      if (shouldFail) {
        reject(new Error(`Simulated failure (probability: ${payload.failProbability})`));
      } else {
        resolve({
          message: 'Simulation completed successfully',
          duration,
          processedItems: payload.items || 0
        });
      }
    }, duration);

    // Clean up if aborted during wait
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };

    if (signal) {
      signal.addEventListener('abort', onAbort);
    }
  });
};
