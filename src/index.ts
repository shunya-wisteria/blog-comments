export interface Env {
  API_KEY: string,
  DISCORD_WEBHOOK: string,

  FORM_ID:string,
  FORM_NAME_FIELD:string,
  FORM_EMAIL_FIELD:string,
  FORM_COMMENT_FIELD:string,
  FORM_ENTRYID_FIELD:string,
  COM_API_ENDPOINT:string
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
    if(request.method == "GET")
    {
      // クエリパラメータ取得
      const reqUrl = new URL(request.url);
      const params = reqUrl.searchParams;
      const entryId = params.get("entry");

      // GAS API call
      const url = env.COM_API_ENDPOINT + "?entry=" + entryId;
      const init = {method:"GET"};
      const response = await fetch(url, init);
      res = await response.json();
    }

    // コメント登録
    else if(request.method == "POST")
    {
      const reqBody:ReqBody = await request.json();

      // google form送信データ
      const submitParams = new FormData();
      submitParams.append(env.FORM_NAME_FIELD, reqBody.name);
      submitParams.append(env.FORM_EMAIL_FIELD, reqBody.mail);
      submitParams.append(env.FORM_COMMENT_FIELD, reqBody.comment);
      submitParams.append(env.FORM_ENTRYID_FIELD, reqBody.entryId);
      const gurl = "https://docs.google.com/forms/d/e/" + env.FORM_ID + "/formResponse";
      const ginit = {
        body: submitParams,
        method: "POST"
      }
      // GoogleForm送信
      const gresponse = await fetch(gurl, ginit);
      // GoogleForm送信失敗
      if(gresponse.status != 200)
      {
        res = {status : "E", code : "9001", resData : null};
        return new Response(JSON.stringify(res), {headers:{
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Content-Type": "application/json; charset=utf-8"
        }});
      }

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

    // return Response.json(res);

  },
} satisfies ExportedHandler<Env>;
