import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface GitHubUserInfo {
  username?: string;
  email?: string;
  source: 'git-config' | 'gh-cli' | 'github-api' | 'ssh-config' | 'unknown';
}

/**
 * Attempts to discover the GitHub username from various sources
 * 
 * Priority:
 * 1. git config github.user
 * 2. GitHub CLI (gh api user)
 * 3. Search GitHub API with email from git config
 * 4. Search GitHub API with email from SSH public key
 */
export async function discoverGitHubUsername(): Promise<GitHubUserInfo> {
  // 1. Try git config github.user
  const fromGitConfig = getGitHubUserFromGitConfig();
  if (fromGitConfig.username) {
    return fromGitConfig;
  }

  // 2. Try GitHub CLI
  const fromGhCli = getGitHubUserFromGhCli();
  if (fromGhCli.username) {
    return fromGhCli;
  }

  // 3. Try GitHub API with git config email
  const gitEmail = getGitConfigEmail();
  if (gitEmail) {
    const fromGitEmail = await searchGitHubByEmail(gitEmail);
    if (fromGitEmail.username) {
      return { ...fromGitEmail, email: gitEmail };
    }
  }

  // 4. Try GitHub API with SSH public key email
  const sshEmail = getEmailFromSshKey();
  if (sshEmail && sshEmail !== gitEmail) {
    const fromSshEmail = await searchGitHubByEmail(sshEmail);
    if (fromSshEmail.username) {
      return { ...fromSshEmail, email: sshEmail, source: 'ssh-config' };
    }
  }

  // Return what we found (possibly just the email)
  return {
    email: gitEmail || sshEmail,
    source: 'unknown',
  };
}

/**
 * Get GitHub username from git config github.user
 */
export function getGitHubUserFromGitConfig(): GitHubUserInfo {
  try {
    const username = execSync('git config --global github.user', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (username) {
      return { username, source: 'git-config' };
    }
  } catch {
    // Not configured
  }

  return { source: 'git-config' };
}

/**
 * Get GitHub username from GitHub CLI (requires gh to be installed and authenticated)
 */
export function getGitHubUserFromGhCli(): GitHubUserInfo {
  try {
    const username = execSync('gh api user --jq .login', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    }).trim();

    if (username) {
      return { username, source: 'gh-cli' };
    }
  } catch {
    // gh not installed or not authenticated
  }

  return { source: 'gh-cli' };
}

/**
 * Get email from git config
 */
export function getGitConfigEmail(): string | undefined {
  try {
    const email = execSync('git config --global user.email', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return email || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get email from SSH public key comment (often contains email)
 */
export function getEmailFromSshKey(sshDir?: string): string | undefined {
  const dir = sshDir || join(homedir(), '.ssh');
  const keyFiles = ['id_ed25519.pub', 'id_rsa.pub', 'id_ecdsa.pub'];

  for (const keyFile of keyFiles) {
    const keyPath = join(dir, keyFile);
    
    if (existsSync(keyPath)) {
      try {
        const content = readFileSync(keyPath, 'utf-8').trim();
        const email = parseEmailFromSshKeyContent(content);
        if (email) {
          return email;
        }
      } catch {
        // Can't read file
      }
    }
  }

  return undefined;
}

/**
 * Parse email from SSH public key content
 * SSH public keys are typically: type base64key comment
 * The comment often contains an email
 */
export function parseEmailFromSshKeyContent(content: string): string | undefined {
  const parts = content.split(' ');
  if (parts.length < 3) {
    return undefined;
  }
  
  const comment = parts[parts.length - 1];
  
  // Check if comment looks like an email
  if (comment && comment.includes('@') && comment.includes('.')) {
    return comment;
  }

  return undefined;
}

/**
 * Search GitHub for a user by email using the GitHub API
 * Note: This only works for users who have their email public
 */
export async function searchGitHubByEmail(email: string): Promise<GitHubUserInfo> {
  try {
    // Use the search API to find users by email
    const response = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'initbox-cli',
        },
      }
    );

    if (!response.ok) {
      return { source: 'github-api' };
    }

    const data = await response.json() as { total_count: number; items: Array<{ login: string }> };
    
    if (data.total_count > 0 && data.items[0]) {
      return {
        username: data.items[0].login,
        source: 'github-api',
      };
    }
  } catch {
    // API error or network issue
  }

  return { source: 'github-api' };
}

/**
 * Get git config user name (display name, not username)
 */
export function getGitConfigName(): string | undefined {
  try {
    const name = execSync('git config --global user.name', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return name || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Synchronous version - only checks local sources (git config and gh cli)
 * Does not make network requests
 */
export function discoverGitHubUsernameSync(): GitHubUserInfo {
  // 1. Try git config github.user
  const fromGitConfig = getGitHubUserFromGitConfig();
  if (fromGitConfig.username) {
    return fromGitConfig;
  }

  // 2. Try GitHub CLI
  const fromGhCli = getGitHubUserFromGhCli();
  if (fromGhCli.username) {
    return fromGhCli;
  }

  // Return email if available
  const email = getGitConfigEmail() || getEmailFromSshKey();
  return {
    email,
    source: 'unknown',
  };
}
