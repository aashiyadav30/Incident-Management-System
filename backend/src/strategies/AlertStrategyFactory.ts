import { IAlertStrategy } from './AlertStrategy.interface';

import { P0AlertStrategy } from './P0AlertStrategy';
import { P1AlertStrategy } from './P1AlertStrategy';
import { P2AlertStrategy } from './P2AlertStrategy';

const strategyMap: Record<'P0' | 'P1' | 'P2', IAlertStrategy> = {
  P0: new P0AlertStrategy(),
  P1: new P1AlertStrategy(),
  P2: new P2AlertStrategy(),
};

export class AlertStrategyFactory {
  static get(severity: 'P0' | 'P1' | 'P2'): IAlertStrategy {
    const strategy = strategyMap[severity];

    if (!strategy) {
      throw new Error(
        `No alert strategy defined for severity: ${severity}`
      );
    }

    return strategy;
  }
}