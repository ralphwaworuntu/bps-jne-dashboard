import { API_URL, authHeaders } from "@/config";

export type JobStatus = {
  id: string;
  job_id?: string;
  kind: string;
  status: "queued" | "running" | "completed" | "failed" | string;
  stage: string;
  percent: number;
  message: string;
  error?: string;
  result?: Record<string, unknown>;
};

export type UploadJobProgress = {
  phase: "uploading" | "processing" | "done" | "error";
  percent: number;
  stage: string;
  message: string;
};

const STAGE_LABEL: Record<string, string> = {
  queued: "Dalam antrian…",
  starting: "Memulai…",
  parsing: "Membaca file…",
  enriching: "Mengolah data…",
  saving: "Menyimpan hasil…",
  completed: "Selesai",
  failed: "Gagal",
};

export function stageLabel(stage: string, fallback?: string): string {
  return STAGE_LABEL[stage] || fallback || stage || "Memproses…";
}

/** Map job percent (0–100) ke overall bar setelah upload bytes (uploadMax%). */
export function mapJobPercent(jobPercent: number, uploadMax = 40): number {
  const p = Math.max(0, Math.min(100, Number(jobPercent) || 0));
  return Math.round(uploadMax + (p / 100) * (100 - uploadMax));
}

export async function pollJobUntilDone(
  jobId: string,
  onProgress: (job: JobStatus) => void,
  opts?: { intervalMs?: number; token?: string | null }
): Promise<JobStatus> {
  const interval = opts?.intervalMs ?? 800;
  const headers = authHeaders(opts?.token) as Record<string, string>;

  for (;;) {
    const res = await fetch(`${API_URL}/api/jobs/${jobId}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `Gagal cek status job (${res.status})`);
    }
    const job = (await res.json()) as JobStatus;
    onProgress(job);
    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(job.error || job.message || "Pemrosesan gagal");
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

/**
 * Upload multipart via XHR (byte progress), expect 202 + job_id, lalu poll job.
 * overall percent: 0–uploadMax upload bytes, uploadMax–100 processing.
 */
export function uploadFormWithJobProgress(
  url: string,
  form: FormData,
  onProgress: (info: UploadJobProgress) => void,
  opts?: { token?: string | null; uploadMax?: number }
): Promise<JobStatus> {
  const token =
    opts?.token ??
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const uploadMax = opts?.uploadMax ?? 40;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || !ev.total) return;
      const pct = Math.round((ev.loaded / ev.total) * uploadMax);
      onProgress({
        phase: "uploading",
        percent: Math.max(0, Math.min(uploadMax, pct)),
        stage: "uploading",
        message: "Mengunggah file…",
      });
    };

    xhr.onload = async () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let msg = "Upload gagal";
        try {
          const parsed = JSON.parse(xhr.responseText || "{}");
          msg = parsed?.detail || parsed?.message || msg;
        } catch {
          msg = xhr.statusText || msg;
        }
        onProgress({
          phase: "error",
          percent: 0,
          stage: "failed",
          message: msg,
        });
        reject(new Error(msg));
        return;
      }

      let body: JobStatus & { job_id?: string };
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        reject(new Error("Respons upload tidak valid"));
        return;
      }
      const jobId = body.job_id || body.id;
      if (!jobId) {
        reject(new Error("job_id tidak ditemukan di respons upload"));
        return;
      }

      onProgress({
        phase: "processing",
        percent: uploadMax,
        stage: body.stage || "queued",
        message: body.message || "Dalam antrian…",
      });

      try {
        const done = await pollJobUntilDone(
          jobId,
          (job) => {
            onProgress({
              phase: "processing",
              percent: mapJobPercent(job.percent, uploadMax),
              stage: job.stage,
              message: job.message || stageLabel(job.stage),
            });
          },
          { token }
        );
        onProgress({
          phase: "done",
          percent: 100,
          stage: "completed",
          message: "Selesai",
        });
        resolve(done);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Pemrosesan gagal";
        onProgress({
          phase: "error",
          percent: 100,
          stage: "failed",
          message: msg,
        });
        reject(e instanceof Error ? e : new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Gagal mengunggah file"));
    xhr.onabort = () => reject(new Error("Upload dibatalkan"));
    xhr.send(form);
  });
}
