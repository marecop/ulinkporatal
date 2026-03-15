import axios from "axios";
import type { DownloadedGraphFile, ExamFileKind } from "../exams/types.js";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const SHAREPOINT_HOST = "guischina.sharepoint.com";
const SHAREPOINT_SITE_PATH = "/sites/ulcstudentportal";
const SEARCH_TERMS = [
  "Exam Arrangement",
  "Attendence Sheet",
  "Attendance Sheet",
  "Classroom Change",
  "Full Centre Supervision",
  "Full Center Supervision",
] as const;
const GRAPH_REQUEST_TIMEOUT_MS = 30000;

export interface GraphSite {
  id: string;
  name?: string;
  webUrl?: string;
}

export interface GraphDriveItem {
  id: string;
  driveId: string;
  driveName?: string;
  name: string;
  webUrl?: string;
  eTag?: string;
  lastModifiedDateTime?: string;
  mimeType?: string;
}

function graphHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
}

function classifyFile(name: string): ExamFileKind | null {
  const lowered = name.toLowerCase();
  if (lowered.includes("attendence sheet") || lowered.includes("attendance sheet")) return "attendance";
  if (lowered.includes("classroom change")) return "classroom-change";
  if (lowered.includes("full centre supervision") || lowered.includes("full center supervision")) {
    return "full-centre-supervision";
  }
  return null;
}

export async function resolveSharePointSite(accessToken: string): Promise<GraphSite> {
  const url = `${GRAPH_BASE_URL}/sites/${SHAREPOINT_HOST}:${SHAREPOINT_SITE_PATH}:/`;
  const response = await axios.get(url, {
    headers: graphHeaders(accessToken),
    timeout: GRAPH_REQUEST_TIMEOUT_MS,
  });

  return {
    id: response.data.id,
    name: response.data.name,
    webUrl: response.data.webUrl,
  };
}

async function listSiteDrives(accessToken: string, siteId: string) {
  const url = `${GRAPH_BASE_URL}/sites/${siteId}/drives?$top=100`;
  const response = await axios.get(url, {
    headers: graphHeaders(accessToken),
    timeout: GRAPH_REQUEST_TIMEOUT_MS,
  });

  return (response.data.value ?? [])
    .filter((drive: any) => Boolean(drive?.id))
    .map((drive: any) => ({
      id: String(drive.id),
      name: drive.name ? String(drive.name) : undefined,
    }));
}

export async function searchExamFiles(accessToken: string, siteId: string) {
  const results = new Map<string, GraphDriveItem & { kind: ExamFileKind }>();
  const drives = await listSiteDrives(accessToken, siteId);

  for (const drive of drives) {
    for (const searchTerm of SEARCH_TERMS) {
      const url = `${GRAPH_BASE_URL}/drives/${drive.id}/root/search(q='${encodeURIComponent(searchTerm)}')?$top=50`;
      const response = await axios.get(url, {
        headers: graphHeaders(accessToken),
        timeout: GRAPH_REQUEST_TIMEOUT_MS,
      });

      for (const item of response.data.value ?? []) {
        const kind = classifyFile(item.name ?? "");
        if (!kind || !item.id || !item.file) continue;
        results.set(`${drive.id}:${item.id}`, {
          id: item.id,
          driveId: drive.id,
          driveName: drive.name,
          name: item.name,
          webUrl: item.webUrl,
          eTag: item.eTag,
          lastModifiedDateTime: item.lastModifiedDateTime,
          mimeType: item.file?.mimeType,
          kind,
        });
      }
    }
  }

  return Array.from(results.values()).sort((left, right) => {
    const leftStamp = left.lastModifiedDateTime ?? "";
    const rightStamp = right.lastModifiedDateTime ?? "";
    return rightStamp.localeCompare(leftStamp);
  });
}

export async function downloadGraphFile(accessToken: string, item: GraphDriveItem & { kind: ExamFileKind }): Promise<DownloadedGraphFile> {
  const url = `${GRAPH_BASE_URL}/drives/${item.driveId}/items/${item.id}/content`;
  const response = await axios.get<ArrayBuffer>(url, {
    headers: {
      ...graphHeaders(accessToken),
      Accept: "*/*",
    },
    responseType: "arraybuffer",
    timeout: GRAPH_REQUEST_TIMEOUT_MS,
  });

  return {
    id: item.id,
    driveId: item.driveId,
    driveName: item.driveName,
    name: item.name,
    webUrl: item.webUrl,
    mimeType: item.mimeType,
    etag: item.eTag,
    lastModifiedDateTime: item.lastModifiedDateTime,
    kind: item.kind,
    buffer: Buffer.from(response.data),
  };
}
