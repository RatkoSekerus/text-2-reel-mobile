import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";

/**
 * Downloads a video and allows the user to save it
 * Downloads the file first (required for sharing API on both platforms)
 * @param url - The signed URL of the video to download
 * @param filename - The filename for the downloaded video
 */
export async function downloadVideo(
  url: string,
  filename: string
): Promise<void> {
  const startTime = Date.now();
  try {
    // Ensure filename has .mp4 extension
    const sanitizedFilename = filename.toLowerCase().endsWith(".mp4")
      ? filename
      : `${filename}.mp4`;

    // Create file URI in the device's document directory
    const fileUri = `${FileSystem.documentDirectory}${sanitizedFilename}`;

    const downloadStartTime = Date.now();
    // Download the video file
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    const downloadEndTime = Date.now();
    const downloadDuration = downloadEndTime - downloadStartTime;

    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }

    // Check if sharing is available
    const shareStartTime = Date.now();
    const isAvailable = await Sharing.isAvailableAsync();

    let shareDuration = 0;
    if (isAvailable) {
      // Share/save the file (allows user to save to gallery/files)
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: "video/mp4",
        dialogTitle: "Save video",
      });
      const shareEndTime = Date.now();
      shareDuration = shareEndTime - shareStartTime;
    } else {
      // Fallback: Open URL in browser if sharing not available
      await Linking.openURL(url);
    }

    const totalTime = Date.now() - startTime;
    console.log("[videoDownload] Download completed", {
      downloadDuration: `${(downloadDuration / 1000).toFixed(2)}s`,
      shareDuration:
        shareDuration > 0 ? `${(shareDuration / 1000).toFixed(2)}s` : "N/A",
      totalTime: `${(totalTime / 1000).toFixed(2)}s`,
      filename,
    });
  } catch (error) {
    console.error("[videoDownload] Error downloading video:", error);
    throw error;
  }
}
