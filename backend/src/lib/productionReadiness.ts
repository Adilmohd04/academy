/**
 * Production Readiness Checker
 * 
 * Validates environment configuration and system health
 * Run before deployment to catch misconfigurations
 */

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  critical: boolean;
}

interface ReadinessReport {
  ready: boolean;
  timestamp: string;
  environment: string;
  checks: CheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Run all production readiness checks
 */
export const runReadinessChecks = async (): Promise<ReadinessReport> => {
  const checks: CheckResult[] = [];
  const env = process.env.NODE_ENV || 'development';

  // Environment Variables
  checks.push(checkEnvVar('SUPABASE_URL', true));
  checks.push(checkEnvVar('SUPABASE_SERVICE_ROLE_KEY', true));
  checks.push(checkEnvVar('CLERK_SECRET_KEY', true));
  checks.push(checkEnvVar('CLERK_PUBLISHABLE_KEY', false));
  checks.push(checkEnvVar('RAZORPAY_KEY_ID', false));
  checks.push(checkEnvVar('RAZORPAY_KEY_SECRET', false));
  checks.push(checkEnvVar('SMTP_USER', false));
  checks.push(checkEnvVar('SMTP_PASS', false));

  // Security checks
  checks.push(checkTLSVerification());
  checks.push(checkNodeEnv());
  checks.push(checkCorsOrigin());

  // Performance checks
  checks.push(await checkDatabaseConnection());
  checks.push(checkRateLimiting());

  // Calculate summary
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warn').length;
  const criticalFailures = checks.filter(c => c.status === 'fail' && c.critical).length;

  return {
    ready: criticalFailures === 0,
    timestamp: new Date().toISOString(),
    environment: env,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed,
      warnings,
    },
  };
};

/**
 * Check if required environment variable is set
 */
const checkEnvVar = (name: string, critical: boolean): CheckResult => {
  const value = process.env[name];
  
  if (!value) {
    return {
      name: `ENV: ${name}`,
      status: critical ? 'fail' : 'warn',
      message: `${name} is not set`,
      critical,
    };
  }

  if (value.includes('your_') || value.includes('xxx') || value.includes('placeholder')) {
    return {
      name: `ENV: ${name}`,
      status: critical ? 'fail' : 'warn',
      message: `${name} appears to be a placeholder value`,
      critical,
    };
  }

  return {
    name: `ENV: ${name}`,
    status: 'pass',
    message: `${name} is configured`,
    critical,
  };
};

/**
 * Check TLS verification is enabled
 */
const checkTLSVerification = (): CheckResult => {
  const disabled = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';
  
  if (disabled && process.env.NODE_ENV === 'production') {
    return {
      name: 'Security: TLS Verification',
      status: 'fail',
      message: 'TLS verification is DISABLED in production - this is a security risk!',
      critical: true,
    };
  }

  if (disabled) {
    return {
      name: 'Security: TLS Verification',
      status: 'warn',
      message: 'TLS verification is disabled (acceptable in development)',
      critical: false,
    };
  }

  return {
    name: 'Security: TLS Verification',
    status: 'pass',
    message: 'TLS verification is enabled',
    critical: true,
  };
};

/**
 * Check NODE_ENV is set correctly
 */
const checkNodeEnv = (): CheckResult => {
  const env = process.env.NODE_ENV;
  
  if (!env) {
    return {
      name: 'Config: NODE_ENV',
      status: 'warn',
      message: 'NODE_ENV is not set, defaulting to development',
      critical: false,
    };
  }

  if (!['development', 'production', 'test'].includes(env)) {
    return {
      name: 'Config: NODE_ENV',
      status: 'warn',
      message: `NODE_ENV has unusual value: ${env}`,
      critical: false,
    };
  }

  return {
    name: 'Config: NODE_ENV',
    status: 'pass',
    message: `NODE_ENV is set to ${env}`,
    critical: false,
  };
};

/**
 * Check CORS origin configuration
 */
const checkCorsOrigin = (): CheckResult => {
  const origin = process.env.CORS_ORIGIN;
  
  if (!origin) {
    return {
      name: 'Security: CORS Origin',
      status: 'warn',
      message: 'CORS_ORIGIN not set, may allow all origins',
      critical: false,
    };
  }

  if (origin === '*' && process.env.NODE_ENV === 'production') {
    return {
      name: 'Security: CORS Origin',
      status: 'fail',
      message: 'CORS allows all origins (*) in production',
      critical: true,
    };
  }

  return {
    name: 'Security: CORS Origin',
    status: 'pass',
    message: `CORS configured for: ${origin.substring(0, 50)}...`,
    critical: false,
  };
};

/**
 * Check database connection
 */
const checkDatabaseConnection = async (): Promise<CheckResult> => {
  try {
    const { supabase } = await import('../config/database');
    const start = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const duration = Date.now() - start;

    if (error) {
      return {
        name: 'Database: Connection',
        status: 'fail',
        message: `Database query failed: ${error.message}`,
        critical: true,
      };
    }

    if (duration > 5000) {
      return {
        name: 'Database: Connection',
        status: 'warn',
        message: `Database connection is slow (${duration}ms)`,
        critical: false,
      };
    }

    return {
      name: 'Database: Connection',
      status: 'pass',
      message: `Database connected (${duration}ms)`,
      critical: true,
    };
  } catch (error) {
    return {
      name: 'Database: Connection',
      status: 'fail',
      message: `Database connection error: ${(error as Error).message}`,
      critical: true,
    };
  }
};

/**
 * Check rate limiting is configured
 */
const checkRateLimiting = (): CheckResult => {
  // Check if rate limiter middleware is likely configured
  // This is a heuristic check
  try {
    require('../middleware/rateLimiter');
    return {
      name: 'Security: Rate Limiting',
      status: 'pass',
      message: 'Rate limiting middleware is available',
      critical: false,
    };
  } catch {
    return {
      name: 'Security: Rate Limiting',
      status: 'warn',
      message: 'Rate limiting middleware not found',
      critical: false,
    };
  }
};

/**
 * Format report for console output
 */
export const formatReport = (report: ReadinessReport): string => {
  const lines: string[] = [];
  
  lines.push('\n' + '='.repeat(60));
  lines.push('🔍 PRODUCTION READINESS REPORT');
  lines.push('='.repeat(60));
  lines.push(`Environment: ${report.environment}`);
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Status: ${report.ready ? '✅ READY' : '❌ NOT READY'}`);
  lines.push('-'.repeat(60));

  report.checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
    const critical = check.critical ? ' [CRITICAL]' : '';
    lines.push(`${icon} ${check.name}${critical}`);
    lines.push(`   ${check.message}`);
  });

  lines.push('-'.repeat(60));
  lines.push(`Summary: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warnings} warnings`);
  lines.push('='.repeat(60) + '\n');

  return lines.join('\n');
};
