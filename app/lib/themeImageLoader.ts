// app/lib/themeImageLoader.ts

function importAll(r: __WebpackModuleApi.RequireContext) {
    return r.keys().map((file) => file.replace("./", ""));
  }
  
  // Register all theme folders statically
  export const themeImages: Record<number, string[]> = {
    1: importAll(require.context("../../public/themes/1", false, /\.(png|jpe?g|webp)$/)),
    2: importAll(require.context("../../public/themes/2", false, /\.(png|jpe?g|webp)$/)),
    3: importAll(require.context("../../public/themes/3", false, /\.(png|jpe?g|webp)$/)),
    4: importAll(require.context("../../public/themes/4", false, /\.(png|jpe?g|webp)$/)),
  };
  
  // Convert filenames to public URLs
  export const getThemeImages = (id: number) => {
    if (!themeImages[id]) return [];
    return themeImages[id].map((file) => `/themes/${id}/${file}`);
  };
  