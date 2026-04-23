import { test, expect } from 'vitest';
import { formatCurrency, formatGold } from './format.js';

test('formats millions with 1 decimal', () => {
  expect(formatCurrency(52123978.04)).toBe('52.1M');
});

test('formats exact million', () => {
  expect(formatCurrency(1000000)).toBe('1.0M');
});

test('formats thousands with no decimal', () => {
  expect(formatCurrency(981053)).toBe('981K');
});

test('formats small values to 2 decimals', () => {
  expect(formatCurrency(3.14)).toBe('3.14');
});

test('formats zero', () => {
  expect(formatCurrency(0)).toBe('0.00');
});

test('handles null currency', () => {
  expect(formatCurrency(null)).toBe('—');
});

test('handles undefined currency', () => {
  expect(formatCurrency(undefined)).toBe('—');
});

test('formats gold to 2 decimals', () => {
  expect(formatGold(2188.1234)).toBe('2188.12');
});

test('formats zero gold', () => {
  expect(formatGold(0)).toBe('0.00');
});

test('handles null gold', () => {
  expect(formatGold(null)).toBe('—');
});
