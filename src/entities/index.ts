import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SignalDirection } from '../common/types';

@Entity('signals')
export class SignalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 20 })
  symbol!: string;

  @Column({ type: 'varchar', length: 10 })
  direction!: SignalDirection;

  @Column({ type: 'float' })
  confidence!: number;

  @Column({ type: 'float' })
  rawConfidence!: number;

  @Column({ type: 'boolean', default: false })
  weakSignal!: boolean;

  @Column({ type: 'float' })
  entryPrice!: number;

  @Column({ type: 'float' })
  stopLoss!: number;

  @Column({ type: 'float' })
  takeProfit1!: number;

  @Column({ type: 'float' })
  takeProfit2!: number;

  @Column({ type: 'float' })
  riskReward1!: number;

  @Column({ type: 'float' })
  riskReward2!: number;

  @Column({ type: 'simple-json' })
  components!: Record<string, number>;

  @Column({ type: 'simple-json', nullable: true })
  notes!: string[] | null;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity('backtest_results')
export class BacktestResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 20 })
  symbol!: string;

  @Column({ type: 'int' })
  days!: number;

  @Column({ type: 'float' })
  totalReturnPct!: number;

  @Column({ type: 'float' })
  sharpeRatio!: number;

  @Column({ type: 'float' })
  maxDrawdownPct!: number;

  @Column({ type: 'float' })
  winRatePct!: number;

  @Column({ type: 'float' })
  avgRiskReward!: number;

  @Column({ type: 'float' })
  profitFactor!: number;

  @Column({ type: 'int' })
  totalTrades!: number;

  @Column({ type: 'boolean' })
  poorMetrics!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity('oi_history')
export class OiHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 20 })
  symbol!: string;

  @Column({ type: 'float' })
  openInterest!: number;

  @CreateDateColumn()
  recordedAt!: Date;
}
