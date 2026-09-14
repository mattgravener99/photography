const tokenInput = document.getElementById("token");
const repoInput = document.getElementById("repo");
const branchInput = document.getElementById("branch");
const filesInput = document.getElementById("files");
const itemsEl = document.getElementById("items");
const uploadBtn = document.getElementById("upload");
const logEl = document.getElementById("log");

const FULL_MAX_DIM = 2400;
const THUMB_MAX_DIM = 600;
const JPEG_QUALITY = 0.85;

let selected = [];

tokenInput.value = sessionStorage.getItem("gh_token") || "";
repoInput.value = sessionStorage.getItem("gh_repo") || "";
branchInput.value = sessionStorage.getItem("gh_branch") || "main";

tokenInput.addEventListener("change", () => sessionStorage.setItem("gh_token", tokenInput.value));
repoInput.addEventListener("change", () => sessionStorage.setItem("gh_repo", repoInput.value));
branchInput.addEventListener("change", () => sessionStorage.setItem("gh_branch", branchInput.value));

function log(message) {
  logEl.textContent += message + "\n";
}

function slugify(name) {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "photo";
}

function resizeImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Failed to encode image"));
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image: " + file.name));
    };
    img.src = url;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

filesInput.addEventListener("change", () => {
  selected = Array.from(filesInput.files).map((file) => ({
    file,
    slug: slugify(file.name),
    caption: "",
  }));
  itemsEl.innerHTML = "";
  selected.forEach((entry, index) => {
    const wrap = document.createElement("div");
    wrap.className = "item";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(entry.file);

    const captionInput = document.createElement("input");
    captionInput.type = "text";
    captionInput.placeholder = "Caption (optional)";
    captionInput.addEventListener("input", () => {
      selected[index].caption = captionInput.value;
    });

    wrap.appendChild(img);
    wrap.appendChild(captionInput);
    itemsEl.appendChild(wrap);
  });
  uploadBtn.disabled = selected.length === 0;
});

async function githubRequest(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }
  return response.json();
}

async function getFileSha(repo, branch, path, headers) {
  const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.sha;
}

async function putFile(repo, branch, path, base64Content, message, headers) {
  const sha = await getFileSha(repo, branch, path, headers);
  const body = {
    message,
    content: base64Content,
    branch,
  };
  if (sha) body.sha = sha;
  return githubRequest(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

uploadBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  const repo = repoInput.value.trim();
  const branch = branchInput.value.trim() || "main";

  if (!token || !repo || selected.length === 0) {
    log("Missing token, repo, or files.");
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  uploadBtn.disabled = true;
  logEl.textContent = "";

  const newEntries = [];

  for (const entry of selected) {
    try {
      log(`Processing ${entry.file.name}...`);

      const fullBlob = await resizeImage(entry.file, FULL_MAX_DIM, JPEG_QUALITY);
      const thumbBlob = await resizeImage(entry.file, THUMB_MAX_DIM, JPEG_QUALITY);

      const fullBase64 = await blobToBase64(fullBlob);
      const thumbBase64 = await blobToBase64(thumbBlob);

      const stamp = Date.now();
      const fullPath = `photos/full/${entry.slug}-${stamp}.jpg`;
      const thumbPath = `photos/thumbs/${entry.slug}-${stamp}.jpg`;

      await putFile(repo, branch, fullPath, fullBase64, `Add photo ${entry.slug}`, headers);
      log(`Uploaded ${fullPath}`);

      await putFile(repo, branch, thumbPath, thumbBase64, `Add thumbnail for ${entry.slug}`, headers);
      log(`Uploaded ${thumbPath}`);

      newEntries.push({
        file: entry.slug,
        full: `/${fullPath}`,
        thumb: `/${thumbPath}`,
        caption: entry.caption,
        date: new Date().toISOString().slice(0, 10),
      });
    } catch (error) {
      log(`Error on ${entry.file.name}: ${error.message}`);
    }
  }

  if (newEntries.length > 0) {
    try {
      log("Updating photo index...");
      const dataPath = "_data/photos.yml";
      const existingSha = await getFileSha(repo, branch, dataPath, headers);

      let existingYaml = "";
      if (existingSha) {
        const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(dataPath)}?ref=${encodeURIComponent(branch)}`;
        const fileData = await githubRequest(url, { headers });
        existingYaml = atob(fileData.content.replace(/\n/g, ""));
      }

      const newYamlLines = newEntries
        .map(
          (entry) =>
            `- file: ${JSON.stringify(entry.file)}\n  full: ${JSON.stringify(entry.full)}\n  thumb: ${JSON.stringify(entry.thumb)}\n  caption: ${JSON.stringify(entry.caption)}\n  date: ${JSON.stringify(entry.date)}`
        )
        .join("\n");

      const trimmedExisting = existingYaml.trim();
      const hasExistingEntries = trimmedExisting.length > 0 && trimmedExisting !== "[]";
      const combinedYaml = hasExistingEntries
        ? `${trimmedExisting}\n${newYamlLines}\n`
        : `${newYamlLines}\n`;

      const combinedBase64 = btoa(unescape(encodeURIComponent(combinedYaml)));

      await putFile(repo, branch, dataPath, combinedBase64, `Add ${newEntries.length} photo(s) to index`, headers);
      log("Photo index updated. Site will rebuild shortly.");
    } catch (error) {
      log(`Error updating photo index: ${error.message}`);
    }
  }

  uploadBtn.disabled = false;
  log("Done.");
});
