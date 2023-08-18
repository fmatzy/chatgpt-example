const MAX_CHUNK_SIZE = 6000;

export function splitGitDiffChunks(diff: string): string[] {
  const chunks: string[] = [];
  const lines = diff.split("\n");

  let currentChunk: string[] = [];
  let currentChunkSize = 0
  lines.forEach((line) => {
    if (line.length > 0) {
        currentChunkSize += 1;
    }
    currentChunk.push(line);
    currentChunkSize += line.length;

    if (currentChunkSize >= MAX_CHUNK_SIZE) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
      currentChunkSize = 0;
    }
  });

    if (currentChunk.length > 0) {
        const lastChunk = currentChunk.join("\n");
        if (lastChunk.length < MAX_CHUNK_SIZE / 2) {
            chunks[chunks.length - 1] += lastChunk;
        } else {
            chunks.push(lastChunk);
        }
    }

  return chunks;
}
