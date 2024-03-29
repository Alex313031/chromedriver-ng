const { promises: fs } = require('fs')
const path = require('path')
const { downloadArtifact } = require('@electron/get')
const extractZip = require('extract-zip')
const versionToDownload = require('./package').version

let electronSource;
// Use my optimized Electron builds unless SSE4 is set
if (process.env.ELECTRON_SSE4 === '1') {
  electronSource = 'https://github.com/electron/electron/releases/download/';
} else {
  electronSource = 'https://github.com/Alex313031/electron-12.2.3/releases/download/';
}

function download (version) {
  return downloadArtifact({
    version,
    artifactName: 'chromedriver',
    force: process.env.force_no_cache === 'true',
    disableChecksumSafetyCheck: true,
    unsafelyDisableChecksums: true,
    mirrorOptions: { mirror: electronSource },
    cacheRoot: process.env.electron_config_cache,
    platform: process.env.npm_config_platform,
    arch: process.env.npm_config_arch,
    rejectUnauthorized: process.env.npm_config_strict_ssl === 'true',
    quiet: false
  })
}

async function attemptDownload (version) {
  try {
    const targetFolder = path.join(__dirname, 'bin')
    const zipPath = await download(version)
    await extractZip(zipPath, { dir: targetFolder })
    const platform = process.env.npm_config_platform || process.platform
    if (platform !== 'win32') {
      await fs.chmod(path.join(targetFolder, 'chromedriver'), 0o755)
    }
  } catch (err) {
    // attempt to fall back to semver minor
    const parts = version.split('.')
    const baseVersion = `${parts[0]}.${parts[1]}.0`

    // don't recurse infinitely
    if (baseVersion === version) {
      throw err
    } else {
      await attemptDownload(baseVersion)
    }
  }
}

attemptDownload(versionToDownload)
