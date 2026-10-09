# Test first, then live

There are two repos with the same code. Each one publishes its `main` branch to
GitHub Pages automatically (see `.github/workflows/deploy.yml`).

| Site | Repo | URL |
| ---- | ---- | --- |
| **Test** | `askdangerousquestions/ballistics-calculator-test` | https://askdangerousquestions.github.io/ballistics-calculator-test/ |
| **Live** | `askdangerousquestions/ballistics-calculator` | https://askdangerousquestions.github.io/ballistics-calculator/ |

In a local clone, `origin` is the live repo and `test` is the test repo.

## Making a change

1. Make the change and commit it locally.
2. Check it builds: `npm ci && npm run typecheck && npm test && npm run build`.
3. Push to the **test** site only:

   ```sh
   git push test HEAD:main
   ```

4. Wait for the "Deploy to GitHub Pages" action in the test repo to finish
   (about a minute), then try the change on the test URL.
5. **Only after the change is approved**, push the exact same commit to live:

   ```sh
   git push origin HEAD:main
   ```

Nothing reaches the live site until step 5. If the test site shows a problem,
fix it and repeat from step 1; the live site keeps running the previous version.

## Rolling back the live site

Push the last good commit back to live, e.g. `git push --force origin <good-sha>:main`,
or re-run an older successful deploy from the live repo's Actions tab.

## Local development

```sh
npm install
npm run dev          # http://localhost:5173/
BASE_PATH=/ballistics-calculator/ npm run build && npm run preview
```

`BASE_PATH` sets the URL prefix; the deploy workflow sets it to `/<repo-name>/`.
Tests use `node --experimental-strip-types`, so they need Node 22 or newer.
