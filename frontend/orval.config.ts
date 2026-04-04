// module.exports = {
//   'my-watch-tower': {
//     input: 'http://localhost:3000/api-json',
//     output: {
//       mode: 'tags-split',
//       target: 'src/api/generated',
//       schemas: 'src/api/model',
//       client: 'react-query',
//       baseUrl: 'http://localhost:3000',
//     },
//   },
// };

import { defineConfig } from 'orval';

export default defineConfig({
  myWatchTower: {
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/model',
      client: 'react-query',
      // mock: true,
      override: {
        mutator: {
          path: 'src/api/mutator/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
    input: {
      target: 'http://localhost:3000/api/swagger-json',
    },
  },
});
