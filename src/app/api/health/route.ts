import { NextResponse } from 'next/server';
import pool from '@/lib/database/postgres';

export async function GET() {
  try {
    // Test database connection
    const client = await pool.connect();
    
    try {
      // Simple query to test connection
      const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
      const { current_time, postgres_version } = result.rows[0];
      
      return NextResponse.json({
        status: 'OK',
        database: 'Connected',
        timestamp: current_time,
        postgres_version: postgres_version.split(' ')[0], // Just version number
        message: 'Argus API is healthy'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database connection failed'
    }, { status: 500 });
  }
}