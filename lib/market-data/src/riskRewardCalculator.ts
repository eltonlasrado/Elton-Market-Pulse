export interface RiskRewardSetup {
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  positionSize?: number;
  accountRiskPercent?: number;
}

export interface RiskProfile {
  risk: number;
  reward: number;
  ratio: `1:${number}`;
  analysis: string;
  action: 'BUY' | 'SELL' | 'WAIT';
}

export class RiskRewardCalculator {
  static calculateSetup(
    entryPrice: number,
    stopLossPrice: number,
    targetPrice: number
  ): RiskRewardSetup {
    const risk = Math.abs(entryPrice - stopLossPrice);
    const reward = Math.abs(targetPrice - entryPrice);
    const ratio = reward / risk;

    return {
      entryPrice,
      stopLossPrice,
      targetPrice,
      riskAmount: risk,
      rewardAmount: reward,
      riskRewardRatio: ratio,
    };
  }

  static getRiskProfile(riskRewardRatio: number): RiskProfile {
    const reward = Math.round(riskRewardRatio);
    let action: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
    let analysis = '';

    if (riskRewardRatio >= 3) {
      action = 'BUY';
      analysis = `Excellent risk-reward of 1:${reward}. Strong buy signal.`;
    } else if (riskRewardRatio >= 2) {
      action = 'BUY';
      analysis = `Good risk-reward of 1:${reward}. Consider entering.`;
    } else if (riskRewardRatio >= 1.5) {
      action = 'WAIT';
      analysis = `Moderate risk-reward of 1:${reward.toFixed(1)}. Wait for better setup.`;
    } else {
      action = 'WAIT';
      analysis = `Poor risk-reward of 1:${reward.toFixed(1)}. Risk > Reward. Avoid entry.`;
    }

    return {
      risk: 1,
      reward: Math.min(25, Math.max(1, reward)),
      ratio: `1:${Math.min(25, Math.max(1, reward))}`,
      analysis,
      action,
    };
  }

  static calculatePositionSize(
    accountSize: number,
    riskPercent: number,
    entryPrice: number,
    stopLossPrice: number
  ): number {
    const riskAmount = (accountSize * riskPercent) / 100;
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    return priceRisk > 0 ? riskAmount / priceRisk : 0;
  }

  static isValidSetup(setup: RiskRewardSetup, minimumRatio = 1.5): boolean {
    return setup.riskRewardRatio >= minimumRatio;
  }
}

export default RiskRewardCalculator;
