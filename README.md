# PhotoSite

Jekyll photography portfolio, hosted on GitHub Pages. Upload tool at `/admin/` commits resized photos directly via the GitHub API.

## Setup

1. Push this repo to GitHub.
2. Repo Settings → Pages → Source: deploy from branch `main`, root.
3. Repo Settings → Developer settings → Personal access tokens → Fine-grained tokens: create a token scoped to only this repo, with Contents: Read and write permission.
4. Visit `https://<your-site>/admin/`, enter the token, repo (`owner/name`), and branch, then select photos.

## Local preview

Requires Ruby and Bundler.

```
bundle install
bundle exec jekyll serve
```

## How uploads work

`/admin/app.js` resizes each photo in-browser (full: max 2400px, thumb: max 600px, JPEG quality 0.85), commits both to `photos/full/` and `photos/thumbs/` via the GitHub Contents API, then appends an entry to `_data/photos.yml`. The token is kept only in `sessionStorage` for the browser tab — never written to any file, never leaves the browser except to `api.github.com`.

Do not make the repo public with a token that has access beyond it. Use a fine-grained, repo-scoped token only.
