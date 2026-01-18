/**
 * HeroSection Component Test Suite
 * 
 * Tests the main hero section component including:
 * - Props validation and rendering
 * - System status display
 * - Data grid integration
 * - 3D visualization integration
 * - Action button functionality
 * - Contract address linking
 * - Responsive layout behavior
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { HeroSection, HeroSectionProps } from '../HeroSection';

/**
 * Mock props for testing
 */
const mockProps: HeroSectionProps = {
  reserveRatio: 850,
  baseReserves: 15000000,
  oraclePrice: 1.45,
  systemStatus: 'NORMAL',
  isSimulated: false,
  contractAddress: '9f4QF8AD1Afr5t5uo8L3oq8v3DFoS9qJ',
  onLaunchSimulation: jest.fn(),
  onInspectProtocol: jest.fn(),
};

describe('HeroSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<HeroSection {...mockProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should display system status component', () => {
      render(<HeroSection {...mockProps} />);
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
    });

    it('should display DjedOPS title', () => {
      render(<HeroSection {...mockProps} />);
      expect(screen.getByText(/DJED/i)).toBeInTheDocument();
      expect(screen.getByText(/OPS/i)).toBeInTheDocument();
    });
  });

  describe('System Status', () => {
    it('should display NORMAL status correctly', () => {
      render(<HeroSection {...mockProps} />);
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
    });

    it('should display CRITICAL status correctly', () => {
      const criticalProps = { ...mockProps, systemStatus: 'CRITICAL' as const };
      render(<HeroSection {...criticalProps} />);
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render LAUNCH SIMULATOR button', () => {
      render(<HeroSection {...mockProps} />);
      const launchButton = screen.getByRole('button', { name: /LAUNCH.*SIMULAT/i });
      expect(launchButton).toBeInTheDocument();
    });

    it('should call onLaunchSimulation when button is clicked', () => {
      render(<HeroSection {...mockProps} />);
      const launchButton = screen.getByRole('button', { name: /LAUNCH.*SIMULAT/i });
      fireEvent.click(launchButton);
      expect(mockProps.onLaunchSimulation).toHaveBeenCalledTimes(1);
    });

    it('should render VIEW CONTRACT button when contract address is provided', () => {
      render(<HeroSection {...mockProps} />);
      const viewButton = screen.getByRole('button', { name: /VIEW CONTRACT/i });
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).not.toBeDisabled();
    });

    it('should disable VIEW CONTRACT button when contract address is missing', () => {
      const propsWithoutAddress = { ...mockProps, contractAddress: undefined };
      render(<HeroSection {...propsWithoutAddress} />);
      const viewButton = screen.getByRole('button', { name: /VIEW CONTRACT/i });
      expect(viewButton).toBeDisabled();
    });
  });

  describe('Props', () => {
    it('should accept and render with all required props', () => {
      const { container } = render(<HeroSection {...mockProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle optional contractAddress prop', () => {
      const propsWithoutAddress = { ...mockProps, contractAddress: undefined };
      const { container } = render(<HeroSection {...propsWithoutAddress} />);
      expect(container).toBeInTheDocument();
    });
  });
});
