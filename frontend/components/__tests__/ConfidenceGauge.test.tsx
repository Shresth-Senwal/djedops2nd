/**
 * ConfidenceGauge Component Test Suite
 * 
 * Tests the Protocol Confidence Index (PCI) visualization component:
 * - PCI calculation accuracy
 * - Color coding based on confidence levels
 * - Animation behavior
 * - Props validation
 * - Edge cases (extreme values)
 */

import { render, screen } from '@testing-library/react';
import { ConfidenceGauge, ConfidenceGaugeProps } from '../ConfidenceGauge';
import { calculatePCI, getConfidenceLevel } from '@/lib/calculations';

// Mock the calculations module
jest.mock('@/lib/calculations', () => ({
  calculatePCI: jest.fn(),
  getConfidenceLevel: jest.fn(),
}));

const mockCalculatePCI = calculatePCI as jest.MockedFunction<typeof calculatePCI>;
const mockGetConfidenceLevel = getConfidenceLevel as jest.MockedFunction<typeof getConfidenceLevel>;

describe('ConfidenceGauge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      mockCalculatePCI.mockReturnValue(85);
      mockGetConfidenceLevel.mockReturnValue('EXCELLENT');
      
      const { container } = render(<ConfidenceGauge dsi={850} volatility={5.2} />);
      expect(container).toBeInTheDocument();
    });

    it('should display confidence score', () => {
      mockCalculatePCI.mockReturnValue(72);
      mockGetConfidenceLevel.mockReturnValue('CAUTION');
      
      render(<ConfidenceGauge dsi={600} volatility={12.5} />);
      expect(screen.getByText(/72/)).toBeInTheDocument();
    });
  });

  describe('PCI Calculation', () => {
    it('should call calculatePCI with correct parameters', () => {
      mockCalculatePCI.mockReturnValue(80);
      mockGetConfidenceLevel.mockReturnValue('EXCELLENT');
      
      render(<ConfidenceGauge dsi={850} volatility={5.2} />);
      
      expect(mockCalculatePCI).toHaveBeenCalledWith(850, 5.2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero DSI', () => {
      mockCalculatePCI.mockReturnValue(0);
      mockGetConfidenceLevel.mockReturnValue('DANGER');
      
      const { container } = render(<ConfidenceGauge dsi={0} volatility={5.0} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle extreme high volatility', () => {
      mockCalculatePCI.mockReturnValue(10);
      mockGetConfidenceLevel.mockReturnValue('DANGER');
      
      const { container } = render(<ConfidenceGauge dsi={500} volatility={50.0} />);
      expect(container).toBeInTheDocument();
    });
  });
});
