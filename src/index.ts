export interface Env {
  API_KEY: string,
  DISCORD_WEBHOOK: string,

  BLOG_COM_KV:KVNamespace
}

export interface ReqBody{
  name: string,
  mail: string,
  comment: string,
  entryId: string
}

export default {
  async fetch(request, env:Env, ctx): Promise<Response> {
    let res = {}

    // コメント取得
    if (request.method == "GET") {
      // クエリパラメータ取得
      const reqUrl = new URL(request.url);
      const params = reqUrl.searchParams;
      const entryId = params.get("entry");

      if (entryId?.toString() != null) {
        const response = await env.BLOG_COM_KV.get(entryId?.toString());
        res = {
          status: "S",
          code: "0000",
          msg: "success",
          res: {
            entryId: entryId,
            comments: response != null ? JSON.parse(response) : null
          }
        }
      }
    }

    // コメント登録
    else if(request.method == "POST")
    {
      const reqBody:ReqBody = await request.json();

      			// コメント配列
			let comments = [];

			// 登録済みコメント取得
			const comResponse = await env.BLOG_COM_KV.get(reqBody.entryId);
			// 登録済みの場合は、登録済みコメントを配列に追加
			if(comResponse != null)
			{
				comments = JSON.parse(comResponse);
			}

			// 新規コメントを追加
			comments.push(
				{
					name : reqBody.name,
					comment : reqBody.comment,
					tstmp : new Date()
				}
			);

			// KVを更新する
			await env.BLOG_COM_KV.put(reqBody.entryId, JSON.stringify(comments));

      // discordメッセージ送信
      const sendMsg = {content: "swisteria.com にコメントが登録されました。\nお名前：" + reqBody.name + "\nエントリID：" + reqBody.entryId + "\nコメント：" + reqBody.comment};

      const init = {
        body: JSON.stringify(sendMsg),
        method: "POST",
        headers: {
          "content-type": "application/json;charset=UTF-8",
        }
      };
      const url = env.DISCORD_WEBHOOK;

      const response = await fetch(url, init);
      if(response.status > 299)
      {
        res = {status : "E", code : "9001", resData : init};
        return new Response(JSON.stringify(res), {headers:{
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Content-Type": "application/json; charset=utf-8"
        }});
      }

      res = {status : "S", code : "0000", resData : init};

    }

    return new Response(JSON.stringify(res), {headers:{
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Content-Type": "application/json; charset=utf-8"
    }});
  },
} satisfies ExportedHandler<Env>;
