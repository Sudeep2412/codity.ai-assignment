const { getPaginationParams, getPaginationMeta } = require('../pagination');

describe('Pagination Utilities', () => {
  describe('getPaginationParams', () => {
    it('should return defaults when no query params provided', () => {
      const result = getPaginationParams({});
      expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
    });

    it('should parse page and limit from query', () => {
      const result = getPaginationParams({ page: '3', limit: '10' });
      expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
    });

    it('should enforce minimum page of 1', () => {
      const result = getPaginationParams({ page: '-5' });
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should default to 20 when limit is 0 (falsy)', () => {
      const result = getPaginationParams({ limit: '0' });
      expect(result.limit).toBe(20);
    });

    it('should enforce maximum limit of 100', () => {
      const result = getPaginationParams({ limit: '500' });
      expect(result.limit).toBe(100);
    });

    it('should handle non-numeric values gracefully', () => {
      const result = getPaginationParams({ page: 'abc', limit: 'xyz' });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('getPaginationMeta', () => {
    it('should calculate total pages correctly', () => {
      const meta = getPaginationMeta(50, 1, 10);
      expect(meta.totalPages).toBe(5);
      expect(meta.total).toBe(50);
    });

    it('should detect hasNextPage and hasPrevPage', () => {
      const meta = getPaginationMeta(50, 2, 10);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(true);
    });

    it('should detect last page', () => {
      const meta = getPaginationMeta(50, 5, 10);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(true);
    });

    it('should detect first page', () => {
      const meta = getPaginationMeta(50, 1, 10);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(false);
    });

    it('should handle zero total items', () => {
      const meta = getPaginationMeta(0, 1, 10);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(false);
    });

    it('should handle partial last page', () => {
      const meta = getPaginationMeta(23, 1, 10);
      expect(meta.totalPages).toBe(3); // ceil(23/10) = 3
    });
  });
});
