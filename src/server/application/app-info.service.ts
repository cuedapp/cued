export interface AppInfo {
  name: "Cued";
  milestone: 13;
  status: "ready";
}

export class AppInfoService {
  getInfo(): AppInfo {
    return { name: "Cued", milestone: 13, status: "ready" };
  }
}
