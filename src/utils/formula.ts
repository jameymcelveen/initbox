import { discoverGitHubUsername, discoverGitHubUsernameSync } from './github.js';

export interface FormulaDownloadResult {
  success: boolean;
  content?: string;
  url?: string;
  error?: string;
  username?: string;
}

/**
 * Attempts to download a YAML formula file from the user's GitHub initbox repository
 * 
 * Downloads from: https://raw.githubusercontent.com/<username>/initbox/main/<fileName>
 * 
 * @param fileName - The file name to download (defaults to "default.yaml")
 * @param branch - The branch to download from (defaults to "main")
 * @returns Promise with the download result
 */
export async function downloadFormulaFromGitHub(
  fileName: string = 'default.yaml',
  branch: string = 'main'
): Promise<FormulaDownloadResult> {
  // First, discover the GitHub username
  const userInfo = await discoverGitHubUsername();
  
  if (!userInfo.username) {
    return {
      success: false,
      error: 'Could not discover GitHub username. Please set git config github.user or authenticate with gh cli.',
      username: undefined,
    };
  }

  const url = buildGitHubRawUrl(userInfo.username, fileName, branch);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'initbox-cli',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          url,
          error: `Formula file not found: ${url}`,
          username: userInfo.username,
        };
      }
      
      return {
        success: false,
        url,
        error: `Failed to download formula: ${response.status} ${response.statusText}`,
        username: userInfo.username,
      };
    }

    const content = await response.text();
    
    return {
      success: true,
      content,
      url,
      username: userInfo.username,
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      username: userInfo.username,
    };
  }
}

/**
 * Synchronous version that only builds the URL (does not download)
 * Useful for getting the URL to display to the user
 * 
 * @param fileName - The file name (defaults to "default.yaml")
 * @param branch - The branch (defaults to "main")
 * @returns The URL or undefined if username cannot be discovered
 */
export function getFormulaUrl(
  fileName: string = 'default.yaml',
  branch: string = 'main'
): string | undefined {
  const userInfo = discoverGitHubUsernameSync();
  
  if (!userInfo.username) {
    return undefined;
  }

  return buildGitHubRawUrl(userInfo.username, fileName, branch);
}

/**
 * Build the raw GitHub URL for a file
 */
export function buildGitHubRawUrl(
  username: string,
  fileName: string,
  branch: string = 'main'
): string {
  // Use raw.githubusercontent.com for raw file access
  return `https://raw.githubusercontent.com/${username}/initbox/${branch}/${fileName}`;
}

/**
 * Build the GitHub repository URL (not raw)
 */
export function buildGitHubRepoUrl(username: string): string {
  return `https://github.com/${username}/initbox`;
}

/**
 * Check if a formula exists in the user's GitHub initbox repository
 * 
 * @param fileName - The file name to check (defaults to "default.yaml")
 * @param branch - The branch to check (defaults to "main")
 * @returns Promise with boolean indicating if the file exists
 */
export async function formulaExistsOnGitHub(
  fileName: string = 'default.yaml',
  branch: string = 'main'
): Promise<boolean> {
  const userInfo = await discoverGitHubUsername();
  
  if (!userInfo.username) {
    return false;
  }

  const url = buildGitHubRawUrl(userInfo.username, fileName, branch);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'initbox-cli',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Download a formula from any GitHub user's initbox repository
 * 
 * @param username - The GitHub username
 * @param fileName - The file name to download (defaults to "default.yaml")
 * @param branch - The branch to download from (defaults to "main")
 * @returns Promise with the download result
 */
export async function downloadFormulaFromUser(
  username: string,
  fileName: string = 'default.yaml',
  branch: string = 'main'
): Promise<FormulaDownloadResult> {
  const url = buildGitHubRawUrl(username, fileName, branch);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'initbox-cli',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          url,
          error: `Formula file not found: ${url}`,
          username,
        };
      }
      
      return {
        success: false,
        url,
        error: `Failed to download formula: ${response.status} ${response.statusText}`,
        username,
      };
    }

    const content = await response.text();
    
    return {
      success: true,
      content,
      url,
      username,
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      username,
    };
  }
}

