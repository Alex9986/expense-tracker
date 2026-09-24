import { redirect } from "next/navigation";

/**
 * 单用户应用，没有登录页，根路径直接进入看板。
 * 保留这个跳转是为了让 `/` 和侧边栏的 `/dashboard` 都能用。
 */
export default function RootPage() {
  redirect("/dashboard");
}
