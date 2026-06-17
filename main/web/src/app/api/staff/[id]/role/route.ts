// src/app/api/staff/[id]/role/route.ts
import { NextResponse } from "next/server";
 
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // paramsを正しく非同期で受け取る
  const { id } = await params;
 
  // ここに本来の処理（DB更新など）を書きますが、
  // 一旦ビルドを通すために仮のレスポンスを返します by kkh
  return NextResponse.json({ success: true, id });
}