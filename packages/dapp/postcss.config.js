import autoprefixer from 'autoprefixer';
import postcssNested from 'postcss-nested';
import tailwindcss from '@tailwindcss/postcss';

export default {
    plugins: [
        //Some plugins, like tailwindcss/nesting, need to run before Tailwind,
        tailwindcss(),
        postcssNested(),
        //But others, like autoprefixer, need to run after,
        autoprefixer,
    ],
};
