// 一応　アラートデータのモックをとりあえず返すようにしておく
// 後でbackendと連携できるようになったら
// export async function GET() {
//   const alarmData = await getAlarmDataFromDatabase();
//   return Response.json(alarmData);
// } ように　変える
import { mockAlarmData } from "./mock";
export async function GET() {
	return Response.json(mockAlarmData);
}
