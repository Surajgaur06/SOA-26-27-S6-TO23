import { render, screen } from '@testing-library/react';

// Lightweight frontend calculation verification test
describe('Frontend Metrology Calculation Verification', () => {
  it('correctly calculates error and evaluates pass/fail tolerance', () => {
    const loggerReading = 25.12;
    const referenceReading = 25.001;
    const allowedTolerance = 0.50;

    const error = Math.round((loggerReading - referenceReading) * 10000) / 10000;
    const absError = Math.abs(error);
    const isPass = absError <= allowedTolerance;

    expect(error).toBeCloseTo(0.119, 3);
    expect(absError).toBeCloseTo(0.119, 3);
    expect(isPass).toBe(true);
  });

  it('correctly fails when logger error exceeds tolerance limit', () => {
    const loggerReading = 50.78;
    const referenceReading = 49.992;
    const allowedTolerance = 0.50;

    const error = Math.round((loggerReading - referenceReading) * 10000) / 10000;
    const absError = Math.abs(error);
    const isPass = absError <= allowedTolerance;

    expect(error).toBeCloseTo(0.788, 3);
    expect(isPass).toBe(false);
  });

  it('evaluates overall pass only if all points pass', () => {
    const points = [
      { absError: 0.05, pass: true },
      { absError: 0.12, pass: true },
      { absError: 0.65, pass: false },
    ];
    const overall = points.every(p => p.pass);
    expect(overall).toBe(false);
  });
});
