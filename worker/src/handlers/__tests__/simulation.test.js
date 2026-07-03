const simulationHandler = require('../simulation');

describe('Simulation Handler', () => {
  it('should resolve successfully when no fail probability is provided', async () => {
    const payload = { durationMs: 10, items: 5 };
    const result = await simulationHandler(payload);
    
    expect(result.message).toBe('Simulation completed successfully');
    expect(result.duration).toBe(10);
    expect(result.processedItems).toBe(5);
  });

  it('should reject when failProbability is 1', async () => {
    const payload = { durationMs: 10, failProbability: 1.0 };
    
    await expect(simulationHandler(payload)).rejects.toThrow('Simulated failure');
  });

  it('should abort early if an abort signal is triggered', async () => {
    const controller = new AbortController();
    const payload = { durationMs: 1000 };
    
    // Start handler but don't await immediately
    const promise = simulationHandler(payload, controller.signal);
    
    // Abort after 10ms
    setTimeout(() => {
      controller.abort(new Error('AbortError'));
    }, 10);
    
    await expect(promise).rejects.toThrow('AbortError');
  });

  it('should reject immediately if the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('Pre-aborted'));
    
    const payload = { durationMs: 1000 };
    
    await expect(simulationHandler(payload, controller.signal)).rejects.toThrow('Pre-aborted');
  });
});
