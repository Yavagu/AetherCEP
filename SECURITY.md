# Security policy

## Supported versions

Security fixes are applied to the latest published release. Older versions may be asked to upgrade before a fix is provided.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting feature under **Security > Advisories > Report a vulnerability**, if enabled. Otherwise, contact the repository owner privately through the contact method on their GitHub profile.

Please include the affected version, impact, reproduction steps, and a minimal proof of concept. Do not open a public issue until a maintainer confirms that disclosure is safe. You should receive an acknowledgement within seven days; resolution time depends on severity and complexity.

Never submit real browser cookies, account tokens, private URLs, personal file paths, or downloaded media. Replace sensitive values with obvious placeholders.

## Security model

AetherCEP runs inside Adobe CEP with Node.js enabled. It can launch bundled tools, read selected browser cookies, write downloads, and import files into Premiere. Install releases only from this project's GitHub Releases page, review changes when building from source, and keep yt-dlp current.
