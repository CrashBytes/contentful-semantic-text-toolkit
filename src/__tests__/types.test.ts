/**
 * Types Test Suite
 *
 * Validation of type definitions and SemanticError class behavior.
 */

import { SemanticError, SemanticErrorCode } from '../types';

describe('SemanticError', () => {
  describe('constructor', () => {
    it('creates error with code and message', () => {
      const error = new SemanticError(
        SemanticErrorCode.INVALID_INPUT,
        'Invalid input provided'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SemanticError);
      expect(error.code).toBe(SemanticErrorCode.INVALID_INPUT);
      expect(error.message).toBe('Invalid input provided');
      expect(error.name).toBe('SemanticError');
    });

    it('creates error with details', () => {
      const error = new SemanticError(
        SemanticErrorCode.DIMENSION_MISMATCH,
        'Dimensions do not match',
        { expected: 384, actual: 256 }
      );

      expect(error.details).toEqual({ expected: 384, actual: 256 });
    });

    it('creates error without details', () => {
      const error = new SemanticError(
        SemanticErrorCode.MODEL_NOT_LOADED,
        'Model not loaded'
      );

      expect(error.details).toBeUndefined();
    });
  });

  describe('error codes', () => {
    it('has MODEL_NOT_LOADED code', () => {
      expect(SemanticErrorCode.MODEL_NOT_LOADED).toBe('MODEL_NOT_LOADED');
    });

    it('has INVALID_INPUT code', () => {
      expect(SemanticErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
    });

    it('has EMBEDDING_FAILED code', () => {
      expect(SemanticErrorCode.EMBEDDING_FAILED).toBe('EMBEDDING_FAILED');
    });

    it('has COMPUTATION_FAILED code', () => {
      expect(SemanticErrorCode.COMPUTATION_FAILED).toBe('COMPUTATION_FAILED');
    });

    it('has DIMENSION_MISMATCH code', () => {
      expect(SemanticErrorCode.DIMENSION_MISMATCH).toBe('DIMENSION_MISMATCH');
    });
  });

  describe('error behavior', () => {
    it('can be thrown and caught', () => {
      const throwError = () => {
        throw new SemanticError(
          SemanticErrorCode.INVALID_INPUT,
          'Test error'
        );
      };

      expect(throwError).toThrow(SemanticError);
      expect(throwError).toThrow('Test error');
    });

    it('preserves stack trace', () => {
      const error = new SemanticError(
        SemanticErrorCode.INVALID_INPUT,
        'Test error'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SemanticError');
    });

    it('can be checked with instanceof', () => {
      try {
        throw new SemanticError(
          SemanticErrorCode.MODEL_NOT_LOADED,
          'Model not loaded'
        );
      } catch (error) {
        expect(error instanceof SemanticError).toBe(true);
        expect(error instanceof Error).toBe(true);
      }
    });

    it('code can be used for error handling', () => {
      const handleError = (error: SemanticError): string => {
        switch (error.code) {
          case SemanticErrorCode.MODEL_NOT_LOADED:
            return 'Please initialize the model first';
          case SemanticErrorCode.INVALID_INPUT:
            return 'Please check your input';
          case SemanticErrorCode.DIMENSION_MISMATCH:
            return 'Vector dimensions must match';
          default:
            return 'An error occurred';
        }
      };

      const error1 = new SemanticError(
        SemanticErrorCode.MODEL_NOT_LOADED,
        'Not loaded'
      );
      const error2 = new SemanticError(
        SemanticErrorCode.INVALID_INPUT,
        'Bad input'
      );

      expect(handleError(error1)).toBe('Please initialize the model first');
      expect(handleError(error2)).toBe('Please check your input');
    });
  });
});
