/**
 * Skill & Tech Stack Matching Engine
 * 
 * Automatically detects technical skills, frameworks, and topics from opportunity
 * metadata and computes personalized match scores against user tech stacks.
 */

import { TechOpportunity } from '@/types';

export const POPULAR_TECH_SKILLS = [
  'Python',
  'Rust',
  'Go',
  'C++',
  'TypeScript',
  'PyTorch & Deep Learning',
  'LLMs & Generative AI',
  'Distributed Systems',
  'Kubernetes & Cloud Native',
  'Kernel & Low-Level Systems',
  'Zero-Knowledge & Cryptography',
  'Computer Vision',
  'Robotics & Autonomous Systems',
  'Computer Networks & 5G/6G',
  'Databases & Storage Internals',
  'Web3 & Smart Contracts',
  'Accessibility & Assistive Tech',
] as const;

export type TechSkill = (typeof POPULAR_TECH_SKILLS)[number];

const SKILL_RULES: { skill: TechSkill; pattern: RegExp }[] = [
  {
    skill: 'Python',
    pattern: /\bpython\b/i,
  },
  {
    skill: 'Rust',
    pattern: /\brust\b|\bcargo\b/i,
  },
  {
    skill: 'Go',
    pattern: /\bgolang\b|\bgo language\b|\bwritten in go\b/i,
  },
  {
    skill: 'C++',
    pattern: /\bc\+\+\b|\bcpp\b/i,
  },
  {
    skill: 'TypeScript',
    pattern: /\btypescript\b|\breact\b|\bnext\.js\b|\bnode\.js\b/i,
  },
  {
    skill: 'PyTorch & Deep Learning',
    pattern: /\bpytorch\b|\btensorflow\b|\bdeep learning\b|\bneural network\b|\bbackpropagation\b/i,
  },
  {
    skill: 'LLMs & Generative AI',
    pattern: /\bllm\b|\blarge language model\b|\bgenerative ai\b|\bprompt\b|\bnlp\b|\bnatural language\b|\btransformer\b|\bemnlp\b/i,
  },
  {
    skill: 'Distributed Systems',
    pattern: /\bdistributed\b|\bconsensus\b|\braft\b|\bpaxos\b|\bcluster\b|\bfault-tolerant\b|\bscalability\b|\brpc\b|\bgrpc\b/i,
  },
  {
    skill: 'Kubernetes & Cloud Native',
    pattern: /\bkubernetes\b|\bk8s\b|\bdocker\b|\bcontainer\b|\bmicroservices\b|\bcloud native\b|\baws\b|\bgcp\b|\bcloud\b/i,
  },
  {
    skill: 'Kernel & Low-Level Systems',
    pattern: /\boperating system\b|\bkernel\b|\bmemory safety\b|\bvirtualization\b|\bmicroarchitecture\b|\bcpu\b|\bhardware\b|\basplos\b|\bsosp\b|\bosdi\b/i,
  },
  {
    skill: 'Zero-Knowledge & Cryptography',
    pattern: /\bcryptography\b|\bzero-knowledge\b|\bzkp\b|\bencryption\b|\bprivacy\b|\bcybersecurity\b|\bsecurity\b|\bfuzzing\b/i,
  },
  {
    skill: 'Computer Vision',
    pattern: /\bcomputer vision\b|\bvision\b|\bcvpr\b|\biccv\b|\bimage processing\b|\bsegmentation\b|\bobject detection\b|\bradiance field\b/i,
  },
  {
    skill: 'Robotics & Autonomous Systems',
    pattern: /\brobot\b|\brobotics\b|\bhumanoid\b|\bautonomous driving\b|\bmanipulation\b|\bros\b|\bicra\b|\biros\b/i,
  },
  {
    skill: 'Computer Networks & 5G/6G',
    pattern: /\bnetwork\b|\bnetworking\b|\b5g\b|\b6g\b|\bwireless\b|\bcellular\b|\bpacket\b|\bprotocol\b|\bsigcomm\b|\binfocom\b|\bmobicom\b/i,
  },
  {
    skill: 'Databases & Storage Internals',
    pattern: /\bdatabase\b|\bdatabases\b|\bsql\b|\bstorage\b|\bpersistent memory\b|\bindex\b|\bquery engine\b|\bsigmod\b|\bvldb\b/i,
  },
  {
    skill: 'Web3 & Smart Contracts',
    pattern: /\bweb3\b|\bblockchain\b|\beth\b|\bethereum\b|\bsolidity\b|\bsmart contract\b|\bdefi\b|\bdao\b/i,
  },
  {
    skill: 'Accessibility & Assistive Tech',
    pattern: /\baccessibility\b|\bassistive\b|\buniversal design\b|\bscreen reader\b|\bassets\b/i,
  },
];

/**
 * Automatically extracts relevant tech skills from opportunity fields.
 */
export function extractSkills(opp: {
  title: string;
  description: string;
  subfield?: string | null;
  organizer?: string;
}): string[] {
  const text = `${opp.title} ${opp.description} ${opp.subfield || ''} ${opp.organizer || ''}`;
  const found: string[] = [];

  for (const rule of SKILL_RULES) {
    if (rule.pattern.test(text)) {
      found.push(rule.skill);
    }
  }

  // Subfield mappings
  if (opp.subfield === 'AI / Machine Learning') {
    if (!found.includes('PyTorch & Deep Learning')) found.push('PyTorch & Deep Learning');
  } else if (opp.subfield === 'Systems & Architecture') {
    if (!found.includes('Kernel & Low-Level Systems')) found.push('Kernel & Low-Level Systems');
    if (!found.includes('Distributed Systems')) found.push('Distributed Systems');
  } else if (opp.subfield === 'Security & Privacy') {
    if (!found.includes('Zero-Knowledge & Cryptography')) found.push('Zero-Knowledge & Cryptography');
  } else if (opp.subfield === 'Computer Networks & Mobile') {
    if (!found.includes('Computer Networks & 5G/6G')) found.push('Computer Networks & 5G/6G');
  } else if (opp.subfield === 'Databases & Data Mining') {
    if (!found.includes('Databases & Storage Internals')) found.push('Databases & Storage Internals');
  }

  return Array.from(new Set(found)).slice(0, 5); // Return up to top 5 skills
}

export interface SkillMatchResult {
  matchCount: number;
  percentage: number;
  matchingSkills: string[];
}

/**
 * Computes how well an opportunity matches the user's selected tech stack skills.
 */
export function calculateSkillMatch(
  opportunitySkills: string[],
  userSkills: string[]
): SkillMatchResult {
  if (!userSkills || userSkills.length === 0 || !opportunitySkills || opportunitySkills.length === 0) {
    return { matchCount: 0, percentage: 0, matchingSkills: [] };
  }

  const userSkillSet = new Set(userSkills.map(s => s.toLowerCase()));
  const matches = opportunitySkills.filter(s => userSkillSet.has(s.toLowerCase()));

  const percentage = Math.min(100, Math.round((matches.length / Math.min(userSkills.length, 3)) * 100));

  return {
    matchCount: matches.length,
    percentage,
    matchingSkills: matches,
  };
}

/**
 * Gets the current user skills from browser localStorage.
 */
export function getUserSkills(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('techradar_user_skills');
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore error
  }
  return [];
}

/**
 * Saves user skills to browser localStorage and dispatches change event.
 */
export function saveUserSkills(skills: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('techradar_user_skills', JSON.stringify(skills));
    window.dispatchEvent(new Event('techradar_skills_change'));
  } catch {
    // Ignore error
  }
}
