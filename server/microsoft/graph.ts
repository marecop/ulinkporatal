import axios from "axios";
import type { DownloadedGraphFile, ExamFileKind } from "../exams/types.ts";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const SHAREPOINT_HOST = "guischina.sharepoint.com";
const SHAREPOINT_SITE_PATH = "/sites/ulcstudentportal";
const SEARCH_TERMS = ["Exam Arrangement", "Attendence Sheet", "Attendance Sheet", "Classroom Change"] as const;

export interface GraphSite {
  id: string;
  name?: string;
  webUrl?: string;
}

export interface GraphDriveItem {
  id: string;
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
  return null;
}

export async function resolveSharePointSite(accessToken: string): Promise<GraphSite> {
  const url = `${GRAPH_BASE_URL}/sites/${SHAREPOINT_HOST}:${SHAREPOINT_SITE_PATH}:/`;
  const response = await axios.get(url, {
    headers: graphHeaders(accessToken),
  });

  return {
    id: response.data.id,
    name: response.data.name,
    webUrl: response.data.webUrl,
  };
}

export async function searchExamFiles(accessToken: string, siteId: string) {
  const results = new Map<string, GraphDriveItem & { kind: ExamFileKind }>();

  for (const searchTerm of SEARCH_TERMS) {
    const url = `${GRAPH_BASE_URL}/sites/${siteId}/drive/root/search(q='${encodeURIComponent(searchTerm)}')?$top=50`;
    const response = await axios.get(url, {
      headers: graphHeaders(accessToken),
    });

    for (const item of response.data.value ?? []) {
      const kind = classifyFile(item.name ?? "");
      if (!kind || !item.id || !item.file) continue;
      results.set(item.id, {
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        eTag: item.eTag,
        lastModifiedDateTime: item.lastModifiedDateTime,
        mimeType: item.file?.mimeType,
        kind,
      });
    }
  }

  return Array.from(results.values()).sort((left, right) => {
    const leftStamp = left.lastModifiedDateTime ?? "";
    const rightStamp = right.lastModifiedDateTime ?? "";
    return rightStamp.localeCompare(leftStamp);
  });
}

export async function downloadGraphFile(accessToken: string, siteId: string, item: GraphDriveItem & { kind: ExamFileKind }): Promise<DownloadedGraphFile> {
  const url = `${GRAPH_BASE_URL}/sites/${siteId}/drive/items/${item.id}/content`;
  const response = await axios.get<ArrayBuffer>(url, {
    headers: {
      ...graphHeaders(accessToken),
      Accept: "*/*",
    },
    responseType: "arraybuffer",
  });

  return {
    id: item.id,
    name: item.name,
    webUrl: item.webUrl,
    mimeType: item.mimeType,
    etag: item.eTag,
    lastModifiedDateTime: item.lastModifiedDateTime,
    kind: item.kind,
    buffer: Buffer.from(response.data),
  };
}
