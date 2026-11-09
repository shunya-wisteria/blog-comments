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
    let httpStatus = 200;

    // ルートパス以外は404を返す
    const reqUrl = new URL(request.url);
    if (reqUrl.pathname !== "/") {
      return new Response(JSON.stringify({
        status: "E",
        code: "4040",
        msg: "Not Found"
      }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Content-Type": "application/json; charset=utf-8"
        }
      });
    }

    // OPTIONSメソッドの場合は、CORS対応のために200を返す
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: httpStatus,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
					"Content-Type": "application/json; charset=utf-8"
				}
			});
		}
    // GET, POST以外のメソッドは405を返す
    else if(request.method !== "GET" && request.method !== "POST")
    {
      return new Response(JSON.stringify({
        status: "E",
        code: "4050",
        msg: "Method Not Allowed"
      }), {
        status: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Content-Type": "application/json; charset=utf-8"
        }
      });
    }

    // ------------------------
    // コメント取得
    // ------------------------
    if (request.method == "GET") {
      // クエリパラメータ取得
      const params = reqUrl.searchParams;
      const entryId = params.get("entry");

      // entryIdがnullまたは空文字の場合は、400を返す
      if (entryId == null || entryId == "") {
        httpStatus = 400;
        res = {
          status: "E",
          code: "4000",
          msg: "Bad Request"
        }
        return new Response(JSON.stringify(res), {status: httpStatus, headers:{
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Content-Type": "application/json; charset=utf-8"
        }});
      }

      // entryIdがnullでない場合は、KVからコメントを取得する
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

    // ------------------------
    // コメント登録
    // ------------------------
    else if(request.method == "POST")
    {
      const reqBody:ReqBody = await request.json();

      // リクエストbodyのバリデーション
      if(reqBody.name == null || reqBody.name == "" || reqBody.comment == null || reqBody.comment == "" || reqBody.entryId == null || reqBody.entryId == "")
      {
        res = {status : "E", code : "4000", msg:"Bad Request", resData : reqBody};
        httpStatus = 400;
        return new Response(JSON.stringify(res), {status: httpStatus, headers:{
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Content-Type": "application/json; charset=utf-8"
        }});
      }

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
        httpStatus = 500;
        res = {status : "E", code : "9001", msg: "Internal Server Error", resData : init};
        return new Response(JSON.stringify(res), {status: httpStatus, headers:{
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Content-Type": "application/json; charset=utf-8"
        }});
      }

      res = {status : "S", code : "0000", msg: "success", resData : init};
    }

    return new Response(JSON.stringify(res), {status: httpStatus, headers:{
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Content-Type": "application/json; charset=utf-8"
    }});
  },
} satisfies ExportedHandler<Env>;
