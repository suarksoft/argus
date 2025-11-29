// Demo Transaction Scenarios for Testing

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  xdr: string;
  expectedThreats: number;
  asset?: {
    code: string;
    issuer: string;
  };
}

export const demoScenarios: DemoScenario[] = [
  {
    id: 'safe-usdc-payment',
    title: 'Safe USDC Payment',
    description: 'A standard payment with verified USDC from Circle',
    riskLevel: 'SAFE',
    // Real USDC payment transaction on testnet
    xdr: 'AAAAAgAAAADg3G3hclysZlFitS+s5zWyiiJD5B0STWy5LXCj6i5yxQAAAGQADKI/AAAAAgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADg3G3hclysZlFitS+s5zWyiiJD5B0STWy5LXCj6i5yxQAAAAFVU0RDAAAAAMNlYtAditiJjM8+8BbcFy8H9gqE28z1xAGg7DvLElygAAAAADuaygAAAAAAAAAAAQ==',
    expectedThreats: 0,
    asset: {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    }
  },
  {
    id: 'risky-unknown-asset',
    title: 'Risky Unknown Asset',
    description: 'Payment with an unverified asset from unknown issuer',
    riskLevel: 'MEDIUM',
    // Transaction with unknown asset
    xdr: 'AAAAAgAAAADg3G3hclysZlFitS+s5zWyiiJD5B0STWy5LXCj6i5yxQAAAGQADKI/AAAAAwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADg3G3hclysZlFitS+s5zWyiiJD5B0STWy5LXCj6i5yxQAAAAFTQ0FNAAAAAABBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBAAAAAAAAvrwAAAAAAAAAAAB',
    expectedThreats: 2,
    asset: {
      code: 'SCAM',
      issuer: 'GAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBA'
    }
  },
  {
    id: 'critical-fake-usdc',
    title: 'Critical - Fake USDC',
    description: 'Blacklisted fake USDC attempting to impersonate Circle',
    riskLevel: 'CRITICAL',
    // Transaction with fake USDC (blacklisted issuer)
    xdr: 'AAAAAgAAAADg3G3hclysZlFitS+s5zWyiiJD5B0STWy5LXCj6i5yxQAAAGQADKI/AAAABAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADg3G3hclysZlFitS+s5zWyiiJD5B0STWy5LXCj6i5yxQAAAAFVU0RDAAAAAABBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBAAAAAAAAvrwAAAAAAAAAAAB',
    expectedThreats: 3,
    asset: {
      code: 'USDC',
      issuer: 'GAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBAQBA' // Fake issuer
    }
  }
];

// Helper to get scenario by ID
export function getScenarioById(id: string): DemoScenario | undefined {
  return demoScenarios.find(s => s.id === id);
}

// Helper to get scenarios by risk level
export function getScenariosByRisk(riskLevel: string): DemoScenario[] {
  return demoScenarios.filter(s => s.riskLevel === riskLevel);
}
