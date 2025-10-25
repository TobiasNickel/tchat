// // this file was created by copilot and modified,
// // it is a secure way to enable markdown rendering for our application.
// // it only enables specific features, and limit links and images.


// import MarkdownIt from 'markdown-it'

// export const md = new MarkdownIt({
//   html: false, // Disable HTML tags in source
//   linkify: true, // Autoconvert URL-like text to links
//   typographer: true // Enable some language-neutral replacement + quotes beautification
// });

// // Enable only specific features
// md.enable(['bold', 'link', 'image', 'list', 'ordered_list', 'heading']);

// // Disable changing link text
// md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
//   const token = tokens[idx];
//   const hrefIndex = token.attrIndex('href');
//   if (hrefIndex >= 0) {
//     const href = token.attrs[hrefIndex][1];
//     token.attrs[hrefIndex][1] = href;
//   }
//   return self.renderToken(tokens, idx, options);
// };

// // Restrict image sources to app's own media files
// md.renderer.rules.image = (tokens, idx, options, env, self) => {
//   const token = tokens[idx];
//   const srcIndex = token.attrIndex('src');
//   if (srcIndex >= 0) {
//     const src = token.attrs[srcIndex][1];
//     if (!src.startsWith('/media/')) {
//       return ''; // Ignore images not from the app's media files
//     }
//   }
//   return self.renderToken(tokens, idx, options);
// };

// // const result = md.render('**bold text** [link](http://example.com) ![image](/media/image.png)');
// // console.log(result);

// export function validateMarkdown(input: string) {
//   const tokens = md.parse(input, {});

//   for (const token of tokens) {
//     if (token.type === 'link_open') {
//       const href = token.attrGet('href');
//       if (!href || href !== token.content) {
//         return false; // Invalid link
//       }
//     }

//     if (token.type === 'image') {
//       const src = token.attrGet('src');
//       if (!src || !src.startsWith('/media/')) {
//         return false; // Invalid image source
//       }
//     }

//     if (token.type === 'strong_open' || token.type === 'strong_close') {
//       // Valid bold text
//     } else if (token.type === 'text') {
//       // Valid text
//     } else if (token.type !== 'inline' && token.type !== 'paragraph_open' && token.type !== 'paragraph_close') {
//       return false; // Invalid token type
//     }
//   }

//   return true; // All tokens are valid
// }
