# Security policy

## Supported versions

Security fixes are applied to the latest stable Cued release. Running the
current `latest` or a current versioned release image is recommended.

Experimental images from `develop` are intended for testing and should not be
treated as a supported production channel.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability or include
credentials, private media information, server addresses, or user data in a
report.

Use GitHub's private security-advisory reporting flow for this repository. If
that option is unavailable, contact the repository owner privately through the
contact details on their GitHub profile and include:

- a concise description of the issue and its potential impact;
- steps to reproduce it with sanitized data;
- the affected Cued version and deployment method; and
- any mitigation you have identified.

We will acknowledge a report as soon as practical, investigate it privately,
and coordinate disclosure once a fix or mitigation is available.

## Deployment guidance

Keep `CUED_ENCRYPTION_KEY`, database credentials, provider tokens, STRM output,
and backups private. Use versioned images for production, back up before every
upgrade, and review the [upgrade and rollback guidance](README.md#updating-rollback-and-operating).
