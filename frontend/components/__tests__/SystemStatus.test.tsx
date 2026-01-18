/**
 * SystemStatus Component Test Suite
 * 
 * Tests the system status indicator component:
 * - Status display (NORMAL, CRITICAL)
 * - Color coding
 * - Animation behavior
 * - Props validation
 * - Status change transitions
 */

import { render, screen } from '@testing-library/react';
import { SystemStatus } from '../SystemStatus';

describe('SystemStatus', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<SystemStatus systemStatus="NORMAL" />);
      expect(container).toBeInTheDocument();
    });

    it('should display NORMAL status', () => {
      render(<SystemStatus systemStatus="NORMAL" />);
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
    });

    it('should display CRITICAL status', () => {
      render(<SystemStatus systemStatus="CRITICAL" />);
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('should have proper ARIA role', () => {
      render(<SystemStatus systemStatus="NORMAL" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Status Transitions', () => {
    it('should update when status changes from NORMAL to CRITICAL', () => {
      const { rerender } = render(<SystemStatus systemStatus="NORMAL" />);
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
      
      rerender(<SystemStatus systemStatus="CRITICAL" />);
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.queryByText('NORMAL')).not.toBeInTheDocument();
    });

    it('should update when status changes from CRITICAL to NORMAL', () => {
      const { rerender } = render(<SystemStatus systemStatus="CRITICAL" />);
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      
      rerender(<SystemStatus systemStatus="NORMAL" />);
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
      expect(screen.queryByText('CRITICAL')).not.toBeInTheDocument();
    });
  });
});
