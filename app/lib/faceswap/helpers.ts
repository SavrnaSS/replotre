// /lib/faceswap/helpers.ts

export function dataURLtoFile(dataURL: string, filename: string) {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
  
    while (n--) u8arr[n] = bstr.charCodeAt(n);
  
    return new File([u8arr], filename, { type: mime });
  }
  
  export const urlToBase64 = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  

  /* ---------------------------------------------------
                    FACE SWAP (REWRITTEN CLEAN)
  ---------------------------------------------------- */
  

  // Convert a File to a data URL (full "data:image/..;base64,...")
  async function toBase64(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }
  