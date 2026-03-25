import sqlite3 from 'sqlite3';
import { BridgeState, ProcessedDeposit, PendingMirror, DepositEvent, MirrorStatus } from './types.js';
import { promisify } from 'util';

// Helper functions for BigInt serialization
const serializeWithBigInt = (obj: any): string => {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === 'bigint' ? `__BIGINT__${value.toString()}` : value
  );
};

const deserializeWithBigInt = (str: string): any => {
  return JSON.parse(str, (_key, value) =>
    typeof value === 'string' && value.startsWith('__BIGINT__')
      ? BigInt(value.slice(10))
      : value
  );
};

export class DatabaseService {
  private db: sqlite3.Database;
  private dbRun: (sql: string, params?: any[]) => Promise<void>;
  private dbGet: (sql: string, params?: any[]) => Promise<any>;
  private dbAll: (sql: string, params?: any[]) => Promise<any[]>;

  constructor(private readonly dbPath: string = 'bridge.db') {
    this.db = new sqlite3.Database(this.dbPath);
    
    // Promisify database methods for easier async/await usage
    this.dbRun = promisify(this.db.run.bind(this.db));
    this.dbGet = promisify(this.db.get.bind(this.db));
    this.dbAll = promisify(this.db.all.bind(this.db));
  }

  async initialize(): Promise<void> {
    console.log('💾 Database: Initializing SQLite database...');
    
    // Create tables if they don't exist
    await this.dbRun(`
      CREATE TABLE IF NOT EXISTS processed_deposits (
        transaction_hash TEXT PRIMARY KEY,
        processed_at INTEGER NOT NULL,
        mirror_tx_hash TEXT NOT NULL,
        status INTEGER NOT NULL
      )
    `);

    await this.dbRun(`
      CREATE TABLE IF NOT EXISTS pending_mirrors (
        deposit_tx_hash TEXT PRIMARY KEY,
        deposit_data TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_retry_at INTEGER NOT NULL,
        error_message TEXT
      )
    `);

    await this.dbRun(`
      CREATE TABLE IF NOT EXISTS bridge_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    console.log('✅ Database: Tables initialized successfully');
  }

  async saveBridgeState(state: BridgeState): Promise<void> {
    try {
      // Save processed deposits
      for (const deposit of state.processedDeposits) {
        await this.dbRun(`
          INSERT OR REPLACE INTO processed_deposits 
          (transaction_hash, processed_at, mirror_tx_hash, status) 
          VALUES (?, ?, ?, ?)
        `, [
          deposit.transactionHash,
          Number(deposit.processedAt),
          deposit.mirrorTxHash,
          deposit.status
        ]);
      }

      // Save pending mirrors
      for (const pending of state.pendingMirrors) {
        await this.dbRun(`
          INSERT OR REPLACE INTO pending_mirrors 
          (deposit_tx_hash, deposit_data, retry_count, last_retry_at, error_message) 
          VALUES (?, ?, ?, ?, ?)
        `, [
          pending.depositTxHash,
          serializeWithBigInt(pending.deposit),
          pending.retryCount,
          Number(pending.lastRetryAt),
          pending.errorMessage || null
        ]);
      }

      // Save bridge state metadata
      await this.dbRun(`
        INSERT OR REPLACE INTO bridge_config (key, value) VALUES (?, ?)
      `, ['lastProcessedSlot', state.lastProcessedSlot.toString()]);

      await this.dbRun(`
        INSERT OR REPLACE INTO bridge_config (key, value) VALUES (?, ?)
      `, ['lastProcessedBlockHash', state.lastProcessedBlockHash]);

    } catch (error) {
      console.error('❌ Database: Failed to save bridge state:', error);
      throw error;
    }
  }

  async loadBridgeState(): Promise<BridgeState> {
    try {
      console.log('📖 Database: Loading bridge state from database...');

      // Load processed deposits
      const processedRows = await this.dbAll(`
        SELECT transaction_hash, processed_at, mirror_tx_hash, status 
        FROM processed_deposits
      `);

      const processedDeposits: ProcessedDeposit[] = processedRows.map(row => ({
        transactionHash: row.transaction_hash,
        processedAt: BigInt(row.processed_at),
        mirrorTxHash: row.mirror_tx_hash,
        status: row.status as MirrorStatus
      }));

      // Load pending mirrors
      const pendingRows = await this.dbAll(`
        SELECT deposit_tx_hash, deposit_data, retry_count, last_retry_at, error_message 
        FROM pending_mirrors
      `);

      const pendingMirrors: PendingMirror[] = pendingRows.map(row => ({
        depositTxHash: row.deposit_tx_hash,
        deposit: deserializeWithBigInt(row.deposit_data) as DepositEvent,
        retryCount: row.retry_count,
        lastRetryAt: BigInt(row.last_retry_at),
        errorMessage: row.error_message || undefined
      }));

      // Load bridge metadata
      const lastSlotRow = await this.dbGet(`
        SELECT value FROM bridge_config WHERE key = ?
      `, ['lastProcessedSlot']);

      const lastBlockHashRow = await this.dbGet(`
        SELECT value FROM bridge_config WHERE key = ?
      `, ['lastProcessedBlockHash']);

      const bridgeState: BridgeState = {
        processedDeposits,
        pendingMirrors,
        lastProcessedSlot: BigInt(lastSlotRow?.value || '0'),
        lastProcessedBlockHash: lastBlockHashRow?.value || 'genesis'
      };

      console.log(`✅ Database: Loaded ${processedDeposits.length} processed deposits and ${pendingMirrors.length} pending mirrors`);
      return bridgeState;

    } catch (error) {
      console.error('❌ Database: Failed to load bridge state:', error);
      // Return empty state on error
      return {
        processedDeposits: [],
        pendingMirrors: [],
        lastProcessedSlot: BigInt('0'),
        lastProcessedBlockHash: 'genesis'
      };
    }
  }

  async addProcessedDeposit(deposit: ProcessedDeposit): Promise<void> {
    await this.dbRun(`
      INSERT OR REPLACE INTO processed_deposits 
      (transaction_hash, processed_at, mirror_tx_hash, status) 
      VALUES (?, ?, ?, ?)
    `, [
      deposit.transactionHash,
      Number(deposit.processedAt),
      deposit.mirrorTxHash,
      deposit.status
    ]);
  }

  async addPendingMirror(pending: PendingMirror): Promise<void> {
    await this.dbRun(`
      INSERT OR REPLACE INTO pending_mirrors 
      (deposit_tx_hash, deposit_data, retry_count, last_retry_at, error_message) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      pending.depositTxHash,
      serializeWithBigInt(pending.deposit),
      pending.retryCount,
      Number(pending.lastRetryAt),
      pending.errorMessage || null
    ]);
  }

  async removePendingMirror(depositTxHash: string): Promise<void> {
    await this.dbRun(`
      DELETE FROM pending_mirrors WHERE deposit_tx_hash = ?
    `, [depositTxHash]);
  }

  async updatePendingMirror(depositTxHash: string, retryCount: number, errorMessage?: string): Promise<void> {
    await this.dbRun(`
      UPDATE pending_mirrors 
      SET retry_count = ?, last_retry_at = ?, error_message = ?
      WHERE deposit_tx_hash = ?
    `, [retryCount, Date.now(), errorMessage || null, depositTxHash]);
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Database: Error closing database:', err);
          reject(err);
        } else {
          console.log('✅ Database: Connection closed');
          resolve();
        }
      });
    });
  }
} 