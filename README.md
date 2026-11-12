# Test HUB

A static English computer-science exam practice app.

## Preview locally

From this folder, run `py -m http.server 8000` and open `http://localhost:8000/`. This command requires Python 3.

## Publish on GitHub Pages

1. Create an empty repository named **Test-HUB** under **iamAdarshAnand** if it does not already exist.
2. In a terminal opened in this folder, run the following commands for a new empty repository.

```powershell
git init -b main
git add index.html style.css app.js questions.json README.md .nojekyll
git commit -m "Add Test HUB static exam practice app"
git remote add origin https://github.com/iamAdarshAnand/Test-HUB.git
git push -u origin main
```

3. In the repository, open **Settings → Pages**. Select **Deploy from a branch**, choose **main** and **/(root)**, then save.
4. Check the Pages deployment in **Actions**, then open https://iamadarshanand.github.io/Test-HUB/.

If the remote already contains work, clone it first and copy in the app files before committing. All browser asset paths are relative to support the Pages repository subpath.

## Question bank

Each entry in `questions.json` has a stable ID, PDF page, printed question number, section, stem, options, zero-based answer index, printed explanation, optional elimination notes and optional visuals. Add questions by appending entries with unique IDs. Elimination notes use zero-based option indices as keys. Visuals support `table` objects with headers and rows, and `flow` objects with steps.

The initial extraction contains 3,370 parsed records. Printed keys are retained and have not been independently audited. Some questions rely on figures or contain PDF text extraction errors. 88 answer-bearing candidate blocks failed parsing and eight imported records have no extracted explanation. Custom eliminations and visual aids are sample coverage only.

