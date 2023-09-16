import { fromFileUrl } from "https://deno.land/std@0.192.0/path/mod.ts";
import { WebUI } from "../deno-webui/mod.ts";

async function loadFilesAsync(pathList: string[]): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  const fileReadPromises: Promise<void>[] = [];

  for (const path of pathList) {
    for await (const entry of Deno.readDir(path)) {
      if (entry.isFile) {
        const fileReadPromise = (async () => {
          const file = await Deno.readFile(path + '/' + entry.name);
          files.set(entry.name, new TextDecoder().decode(file));
        })();
        fileReadPromises.push(fileReadPromise);
      }
    }
  }

  await Promise.all(fileReadPromises);

  return files;
}

// const firstWindow = new WebUI({
//   'clearCache': false,
//   // 'libPath': '../webui/dist/webui-2.dylib',
// });

// const files = await loadFilesAsync([
//   './dist', './dist/assets', './dist/excalidraw-assets-dev'
// ]);

async function loadFilesFromGitHubDirs(user: string, repo: string, dirList: string[]): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const baseURL = `https://api.github.com/repos/${user}/${repo}/contents/`;

  const dirFetchPromises: Promise<void>[] = dirList.map(async (dir) => {
    // Fetch the directory listing using GitHub API
    const response = await fetch(baseURL + dir, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch directory ${dir}: ${response.statusText}`);
    }

    const contents: { name: string, download_url: string }[] = await response.json();

    const fileFetchPromises: Promise<void>[] = contents.map(async (content) => {
      if (content.download_url) { // Ensure it's a file, not another directory or other type
        const fileResponse = await fetch(content.download_url);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch ${content.download_url}: ${fileResponse.statusText}`);
        }
        const fileContent = await fileResponse.text();
        files.set(content.name, fileContent);
      }
    });

    await Promise.all(fileFetchPromises);
  });

  await Promise.all(dirFetchPromises);

  return files;
}

const firstWindow = new WebUI({
  'clearCache': false,
  // 'libPath': '../webui/dist/webui-2.dylib',
});

const files = await loadFilesFromGitHubDirs('7flash', 'galaxy-assets-sep16', [
  '', 'assets', 'excalidraw-assets'
]);

firstWindow.setFileHandler(({ pathname }) => {
  const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
  if (files.has(filename)) {
    return files.get(filename);
  } else {
    throw 'unknown file ' + filename;
  }
})

firstWindow.bind('executeDeno', async (inputCode) => {
  try {
    let result = await eval(inputCode.data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

firstWindow.bind('executePython', async (pythonCode: string) => {
  if (typeof pythonCode !== 'string') {
    return { success: false, error: 'Invalid Python code provided' };
  }

  const process = Deno.run({
    cmd: ["python", "-c", pythonCode],
    stdout: "piped",
    stderr: "piped"
  });

  try {
    const { code } = await process.status();
    const [rawOutput, rawError] = await Promise.all([process.output(), process.stderrOutput()]);

    const errorStr = new TextDecoder().decode(rawError);
    const outputStr = new TextDecoder().decode(rawOutput);

    if (code !== 0 || errorStr) {
      return {
        success: false,
        error: `Python process exited with code ${code}. Error: ${errorStr.trim()}`
      };
    }

    return { success: true, data: outputStr.trim() };

  } catch (error) {
    return { success: false, error: `Execution error: ${error.message}` };

  } finally {
    // Clean up resources
    process.stdout.close();
    process.stderr.close();
    process.close();
  }
});


try {
  await firstWindow.show('./dist/index.html');
  // await firstWindow.show((`<html>    <script src="webui.js"></script><p>It is ${new Date().toLocaleTimeString()}</p></html>`))
} catch (err) {
  console.error('err', err);
}

console.assert(firstWindow.isShown, true)

await WebUI.wait();
