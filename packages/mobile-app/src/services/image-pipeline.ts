import { Image } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Compress an image file for upload.
 *
 * - If the file is already < 500 KB, returns the original uri unchanged.
 * - Otherwise resizes so the longer edge is at most 1600 px, then
 *   JPEG-encodes at 0.7 quality.
 *
 * Non-image files (PDFs etc.) must NOT be passed to this function;
 * callers are responsible for the mime-type guard.
 */
export async function compressForUpload(uri: string): Promise<{
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  const originalBytes = info.exists ? info.size : 0;

  if (originalBytes < 500_000) {
    // Already small enough — pass through unchanged.
    // Dimensions are not used by the calling code for this path.
    return { uri, width: 0, height: 0, sizeBytes: originalBytes };
  }

  // Determine dimensions cheaply (no temp file) to decide resize direction.
  const { width, height } = await getImageDimensions(uri);
  const longerEdge = Math.max(width, height);
  const resizeAction =
    longerEdge > 1600
      ? width >= height
        ? { resize: { width: 1600 } }
        : { resize: { height: 1600 } }
      : null;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    resizeAction ? [resizeAction] : [],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );

  const compressedInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
  const sizeBytes = compressedInfo.exists ? compressedInfo.size : 0;

  return { uri: result.uri, width: result.width, height: result.height, sizeBytes };
}
