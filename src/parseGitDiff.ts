export type GitDiffFile = {
  leftFilename: string;
  rightFilename: string;
  changes: string;
};

export function parseGitDiff(diff: string): GitDiffFile[] {
  const files: GitDiffFile[] = [];
  const fileSections = diff.split(/\n*diff --git a\/.* b\/.*\n/);

  fileSections.forEach((section) => {
    const lines = section.split("\n");
    if (lines.length < 3) return;

    const [, leftFileLine, rightFileLine] = lines;

    const leftFilenameMatch = leftFileLine.match(/--- a\/(.*)/);
    if (!leftFilenameMatch) return;

    const rightFilenameMatch = rightFileLine.match(/\+\+\+ b\/(.*)/);
    if (!rightFilenameMatch) return;

    const leftFilename = leftFilenameMatch[1];
    const rightFilename = rightFilenameMatch[1];
    const changes = lines.slice(3).join("\n"); // 最初の行（ファイル名）を除去
    files.push({
      leftFilename,
      rightFilename,
      changes,
    });
  });

  return files;
}
