export type SyntheticFolderFixture = {
  name: string;
  files: Map<string, File>;
  list: File[];
};

export const createSyntheticFile = (
  name: string,
  options?: { type?: string; content?: string | ArrayBuffer; lastModified?: number }
): File => {
  const type = options?.type ?? "application/octet-stream";
  const content = options?.content ?? "";
  const lastModified = options?.lastModified ?? 0;
  return new File([content], name, { type, lastModified });
};

export const createSyntheticFolderFixture = (
  folderName = "folder-A",
  files?: Array<{ name: string; type?: string; content?: string | ArrayBuffer }>
): SyntheticFolderFixture => {
  const entries = files ?? [
    { name: "flat-1x1.png", type: "image/png", content: "pixel" },
    { name: "flat-2x2.png", type: "image/png", content: "pixels" }
  ];

  const list = entries.map((entry) =>
    createSyntheticFile(entry.name, {
      type: entry.type,
      content: entry.content
    })
  );

  const mapped = new Map<string, File>();
  for (const file of list) {
    mapped.set(file.name, file);
  }

  return { name: folderName, files: mapped, list };
};

export type TinyFlatImageInput = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export const createTinyFlatImageInput = (
  width = 1,
  height = 1,
  rgba: readonly [number, number, number, number] = [0, 0, 0, 255]
): TinyFlatImageInput => {
  const pixels = width * height;
  const data = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < pixels; i += 1) {
    const index = i * 4;
    data[index] = rgba[0];
    data[index + 1] = rgba[1];
    data[index + 2] = rgba[2];
    data[index + 3] = rgba[3];
  }

  return { width, height, data };
};
