import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import prefixer from 'postcss-prefix-selector';

// The tracker UI has its own compiled stylesheet (src/internal/internal.css). The fun layer (3D scenes, mascot, birds, games)
// keeps its Tailwind styles, but every rule of src/fun/fun.css is scoped under .fun-scope so the two never collide.
export default {
  plugins: [
    tailwindcss,
    prefixer({
      prefix: '.fun-scope',
      includeFiles: [/fun\.css$/],
      transform(prefix, selector, prefixed) {
        if (selector.startsWith('.fun-scope')) return selector; // already scoped by hand
        if (selector === ':root') return selector; // palette variables stay on <html> so the active theme can override them for the fun pages too
        if (selector === 'html' || selector === 'body') return prefix;
        if (selector.startsWith('body.')) return prefix + selector.slice(4); // body.fun x -> .fun-scope.fun x
        if (selector.startsWith('body ')) return prefix + selector.slice(4);
        if (selector.startsWith('html ')) return prefix + selector.slice(4);
        if (selector.startsWith('html[')) return selector; // theme-mode rules already name <html>
        return prefixed;
      },
    }),
    autoprefixer,
  ],
};
