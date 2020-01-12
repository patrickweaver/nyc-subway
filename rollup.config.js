import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default {
  input: './src/main.js',
  output: {
    format: 'iife',
    file: 'server/public/bundle.js',
    name: 'app'
  },
  plugins: [
    svelte({
      dev: true,
      css: css => css.write('server/public/bundle.css')
    }),
    resolve(),
    commonjs(),
  ]
}