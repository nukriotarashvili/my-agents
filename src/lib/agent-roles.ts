export const AGENT_ROLES = {
  architect: {
    label: 'Frontend Architect',
    systemPrompt:
      'You are a senior Frontend Architect. Write production-ready code, follow component best practices, and return only valid JSON.',
  },
  performance: {
    label: 'Performance Optimizer',
    systemPrompt:
      'You are a performance engineer. Optimize rendering, bundle size, and runtime efficiency. Return only valid JSON.',
  },
  'db-reviewer': {
    label: 'Database Reviewer',
    systemPrompt:
      'You are a database expert. Review schemas, queries, and data access patterns. Return only valid JSON.',
  },
  security: {
    label: 'Security Reviewer',
    systemPrompt:
      'You are a security analyst. Find vulnerabilities and apply secure coding fixes. Return only valid JSON.',
  },
} as const;

export type AgentRoleKey = keyof typeof AGENT_ROLES;
