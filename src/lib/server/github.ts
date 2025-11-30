/**
 * GitHub API Integration
 * STELLARSENTINEL.md dosyasını kontrol eder
 */

export interface GitHubFile {
  content: string;
  sha: string;
  path: string;
}

/**
 * GitHub repo'dan STELLARSENTINEL.md dosyasını çek
 */
export async function fetchStellarSentinelFile(githubRepo: string): Promise<GitHubFile | null> {
  try {
    // GitHub repo URL'ini parse et
    // https://github.com/owner/repo -> owner/repo
    const repoMatch = githubRepo.match(/github\.com\/([\w\-\.]+)\/([\w\-\.]+)/);
    if (!repoMatch) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = repoMatch;
    
    // GitHub API ile dosyayı çek
    // Public repo için token gerekmez
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/STELLARSENTINEL.md`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Argus-Verification',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Dosya bulunamadı
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Base64 decode
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return {
      content,
      sha: data.sha,
      path: data.path,
    };
  } catch (error) {
    console.error('GitHub fetch error:', error);
    return null;
  }
}

/**
 * STELLARSENTINEL.md içinde verification code'u kontrol et
 */
export function extractVerificationCode(content: string): string | null {
  // Format: VRF-XXXXXX veya code: VRF-XXXXXX
  const codeMatch = content.match(/VRF-[A-Z2-9]{6}/i);
  return codeMatch ? codeMatch[0].toUpperCase() : null;
}

/**
 * GitHub repo'nun public olup olmadığını kontrol et
 */
export async function isPublicRepo(githubRepo: string): Promise<boolean> {
  try {
    const repoMatch = githubRepo.match(/github\.com\/([\w\-\.]+)\/([\w\-\.]+)/);
    if (!repoMatch) {
      return false;
    }

    const [, owner, repo] = repoMatch;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Argus-Verification',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return !data.private; // Public ise true
  } catch (error) {
    console.error('Public repo check error:', error);
    return false;
  }
}

