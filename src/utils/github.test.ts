import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import {
  getGitHubUserFromGitConfig,
  getGitHubUserFromGhCli,
  getGitConfigEmail,
  getEmailFromSshKey,
  parseEmailFromSshKeyContent,
  searchGitHubByEmail,
  getGitConfigName,
  discoverGitHubUsernameSync,
  discoverGitHubUsername,
} from './github.js';

// Mock node modules
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockExistsSync = vi.mocked(existsSync);

describe('GitHub Username Discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGitHubUserFromGitConfig', () => {
    it('should return username when git config github.user is set', () => {
      mockExecSync.mockReturnValue('jameymcelveen\n');

      const result = getGitHubUserFromGitConfig();

      expect(result).toEqual({
        username: 'jameymcelveen',
        source: 'git-config',
      });
      expect(mockExecSync).toHaveBeenCalledWith(
        'git config --global github.user',
        expect.any(Object)
      );
    });

    it('should return empty result when git config github.user is not set', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Config not found');
      });

      const result = getGitHubUserFromGitConfig();

      expect(result).toEqual({ source: 'git-config' });
    });

    it('should return empty result when git config returns empty string', () => {
      mockExecSync.mockReturnValue('');

      const result = getGitHubUserFromGitConfig();

      expect(result).toEqual({ source: 'git-config' });
    });
  });

  describe('getGitHubUserFromGhCli', () => {
    it('should return username when gh cli is authenticated', () => {
      mockExecSync.mockReturnValue('jameymcelveen\n');

      const result = getGitHubUserFromGhCli();

      expect(result).toEqual({
        username: 'jameymcelveen',
        source: 'gh-cli',
      });
      expect(mockExecSync).toHaveBeenCalledWith(
        'gh api user --jq .login',
        expect.objectContaining({ timeout: 10000 })
      );
    });

    it('should return empty result when gh cli is not installed', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('command not found: gh');
      });

      const result = getGitHubUserFromGhCli();

      expect(result).toEqual({ source: 'gh-cli' });
    });

    it('should return empty result when gh cli is not authenticated', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not authenticated');
      });

      const result = getGitHubUserFromGhCli();

      expect(result).toEqual({ source: 'gh-cli' });
    });
  });

  describe('getGitConfigEmail', () => {
    it('should return email when git config user.email is set', () => {
      mockExecSync.mockReturnValue('user@example.com\n');

      const result = getGitConfigEmail();

      expect(result).toBe('user@example.com');
    });

    it('should return undefined when git config user.email is not set', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Config not found');
      });

      const result = getGitConfigEmail();

      expect(result).toBeUndefined();
    });

    it('should return undefined when git config returns empty string', () => {
      mockExecSync.mockReturnValue('');

      const result = getGitConfigEmail();

      expect(result).toBeUndefined();
    });
  });

  describe('getGitConfigName', () => {
    it('should return name when git config user.name is set', () => {
      mockExecSync.mockReturnValue('Jamey McElveen\n');

      const result = getGitConfigName();

      expect(result).toBe('Jamey McElveen');
    });

    it('should return undefined when git config user.name is not set', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Config not found');
      });

      const result = getGitConfigName();

      expect(result).toBeUndefined();
    });
  });

  describe('parseEmailFromSshKeyContent', () => {
    it('should extract email from ed25519 public key', () => {
      const content = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample user@example.com';

      const result = parseEmailFromSshKeyContent(content);

      expect(result).toBe('user@example.com');
    });

    it('should extract email from rsa public key', () => {
      const content = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQExample user@domain.org';

      const result = parseEmailFromSshKeyContent(content);

      expect(result).toBe('user@domain.org');
    });

    it('should return undefined when comment is not an email', () => {
      const content = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample my-laptop';

      const result = parseEmailFromSshKeyContent(content);

      expect(result).toBeUndefined();
    });

    it('should return undefined when key has no comment', () => {
      const content = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample';

      const result = parseEmailFromSshKeyContent(content);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty content', () => {
      const result = parseEmailFromSshKeyContent('');

      expect(result).toBeUndefined();
    });
  });

  describe('getEmailFromSshKey', () => {
    it('should return email from first found SSH key', () => {
      mockExistsSync.mockImplementation((path) => {
        return String(path).includes('id_ed25519.pub');
      });
      mockReadFileSync.mockReturnValue(
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample user@example.com'
      );

      const result = getEmailFromSshKey('/mock/.ssh');

      expect(result).toBe('user@example.com');
    });

    it('should try multiple key files until one is found', () => {
      mockExistsSync.mockImplementation((path) => {
        return String(path).includes('id_rsa.pub');
      });
      mockReadFileSync.mockReturnValue(
        'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQExample rsa@example.com'
      );

      const result = getEmailFromSshKey('/mock/.ssh');

      expect(result).toBe('rsa@example.com');
    });

    it('should return undefined when no SSH keys exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = getEmailFromSshKey('/mock/.ssh');

      expect(result).toBeUndefined();
    });

    it('should return undefined when SSH key has no email comment', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample my-computer'
      );

      const result = getEmailFromSshKey('/mock/.ssh');

      expect(result).toBeUndefined();
    });

    it('should handle read errors gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = getEmailFromSshKey('/mock/.ssh');

      expect(result).toBeUndefined();
    });
  });

  describe('searchGitHubByEmail', () => {
    it('should return username when GitHub API finds a user', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          total_count: 1,
          items: [{ login: 'founduser' }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await searchGitHubByEmail('user@example.com');

      expect(result).toEqual({
        username: 'founduser',
        source: 'github-api',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com/search/users'),
        expect.any(Object)
      );

      vi.unstubAllGlobals();
    });

    it('should return empty result when GitHub API returns no users', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          total_count: 0,
          items: [],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await searchGitHubByEmail('unknown@example.com');

      expect(result).toEqual({ source: 'github-api' });

      vi.unstubAllGlobals();
    });

    it('should return empty result when GitHub API returns error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await searchGitHubByEmail('user@example.com');

      expect(result).toEqual({ source: 'github-api' });

      vi.unstubAllGlobals();
    });

    it('should return empty result when fetch throws', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await searchGitHubByEmail('user@example.com');

      expect(result).toEqual({ source: 'github-api' });

      vi.unstubAllGlobals();
    });
  });

  describe('discoverGitHubUsernameSync', () => {
    it('should return username from git config if available', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (String(cmd).includes('github.user')) {
          return 'gitconfiguser\n';
        }
        throw new Error('Not found');
      });

      const result = discoverGitHubUsernameSync();

      expect(result).toEqual({
        username: 'gitconfiguser',
        source: 'git-config',
      });
    });

    it('should fall back to gh cli if git config not set', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (String(cmd).includes('github.user')) {
          throw new Error('Not found');
        }
        if (String(cmd).includes('gh api')) {
          return 'ghcliuser\n';
        }
        throw new Error('Not found');
      });

      const result = discoverGitHubUsernameSync();

      expect(result).toEqual({
        username: 'ghcliuser',
        source: 'gh-cli',
      });
    });

    it('should return email from git config when no username found', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (String(cmd).includes('user.email')) {
          return 'fallback@example.com\n';
        }
        throw new Error('Not found');
      });
      mockExistsSync.mockReturnValue(false);

      const result = discoverGitHubUsernameSync();

      expect(result).toEqual({
        email: 'fallback@example.com',
        source: 'unknown',
      });
    });
  });

  describe('discoverGitHubUsername', () => {
    it('should prioritize git config over other sources', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (String(cmd).includes('github.user')) {
          return 'priority-user\n';
        }
        return '';
      });

      const result = await discoverGitHubUsername();

      expect(result.username).toBe('priority-user');
      expect(result.source).toBe('git-config');
    });

    it('should try GitHub API with git email when local sources fail', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (String(cmd).includes('user.email')) {
          return 'api@example.com\n';
        }
        throw new Error('Not found');
      });
      mockExistsSync.mockReturnValue(false);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          total_count: 1,
          items: [{ login: 'api-found-user' }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await discoverGitHubUsername();

      expect(result.username).toBe('api-found-user');
      expect(result.email).toBe('api@example.com');
      expect(result.source).toBe('github-api');

      vi.unstubAllGlobals();
    });

    it('should try SSH key email as last resort', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not found');
      });
      mockExistsSync.mockImplementation((path) => {
        return String(path).includes('id_ed25519.pub');
      });
      mockReadFileSync.mockReturnValue(
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample ssh@example.com'
      );

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          total_count: 1,
          items: [{ login: 'ssh-found-user' }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await discoverGitHubUsername();

      expect(result.username).toBe('ssh-found-user');
      expect(result.email).toBe('ssh@example.com');
      expect(result.source).toBe('ssh-config');

      vi.unstubAllGlobals();
    });
  });
});

