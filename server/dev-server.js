import express from 'express';
import {mountDevApi} from './dev-api.js';

// Optional standalone DEV process. The normal `npm run dev` does not need this
// process anymore: DEV is mounted under /api/dev-standalone on the main server.
const app=express();
app.use(express.json());
mountDevApi({
  get:(path,handler)=>app.get(path,handler),
  post:(path,handler)=>app.post(path,handler)
});
const PORT=Number(process.env.OKOC_DEV_PORT||10001);
app.get('/health',(_,res)=>res.json({ok:true,service:'okoc-dev',port:PORT,isolated:true,standalone:true}));
app.listen(PORT,'127.0.0.1',()=>console.log(`OKOC optional standalone DEV server listening on http://127.0.0.1:${PORT}`));
