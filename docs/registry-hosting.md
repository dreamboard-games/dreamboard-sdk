# Source registry hosting

The prepared `Publish source registry` workflow hosts shadcn payloads at
`https://registry.dreamboard.games/r/{name}.json` using GitHub Pages. It is manual,
requires the default branch, verifies pure and SDK-bound installation, and
publishes an artifact with `revision.txt` identifying the exact source commit.
It does not run on push or pull requests.

Hosting is not active yet: the repository Pages API returned404 on2026-09-24.
Adding this workflow does not enable Pages, configure DNS, or publish a site.
Those operator actions are a separate delivery step after review:

1. Enable Pages for `dreamboard-games/dreamboard-sdk` with GitHub Actions as the
   publishing source; configure the `github-pages` environment for the reviewed
   default branch.
2. Verify the domain for the organization, then configure the repository Pages
   custom domain as `registry.dreamboard.games`.
3. Set the `registry` DNS CNAME to `dreamboard-games.github.io` and enable HTTPS
   once GitHub's certificate is ready. GitHub Actions Pages deployments do not
   use a repository `CNAME` file.
4. Dispatch `registry.yml` at the reviewed default-branch revision. Verify that
   `/revision.txt` equals the deployed commit and `/r/playing-card.json` is an
   actual shadcn item payload, then run a fresh shadcn install against the public
   namespace. A successful local build alone is not deployment evidence.

The workflow uses GitHub's maintained Pages actions and short-lived workflow
credentials. See the official [custom workflow instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
and [custom domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
