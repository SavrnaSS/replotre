export const loadThemeImages = (id: number) => {
  const context = require.context(
    `../../public/themes/${id}`,
    false,
    /\.(png|jpe?g|webp)$/
  );

  // Convert imported modules to usable public URLs
  return context.keys().map((file: string) =>
    `/themes/${id}/${file.replace("./", "")}`
  );
};
