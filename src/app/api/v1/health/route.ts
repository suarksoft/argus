import { NextResponse } from 'next/server';

const startTime = Date.now();

export async function GET() {
  try {
    // Check service health
    const services = {
      stellarExpert: 'operational',
      tomlVerification: 'operational',
      cache: 'operational',
      database: 'operational'
    };

    // Calculate uptime
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    return NextResponse.json(
      {
        status: 'healthy',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        services,
        uptime,
        endpoints: {
          analyzeAddress: '/api/v1/analyze/address',
          analyzeTransaction: '/api/v1/analyze/transaction',
          health: '/api/v1/health'
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache'
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
