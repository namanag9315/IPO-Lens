import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ChapterRow = Record<string, unknown>;

export default async function IPOGuideAdminPage() {
  const chapters = isSupabaseConfigured()
    ? await safeRows<ChapterRow>(supabaseAdmin.from("ipo_guide_chapters").select("*").order("sort_order", { ascending: true }))
    : [];

  return (
    <>
      <AdminPageHeader title="IPO Guide Content" subtitle="Manage gamified guide chapters, quizzes, XP and publication status." />

      <section className="admin-panel">
        <h2>Chapter editor</h2>
        <div className="admin-form-grid">
          {["Chapter title", "Subtitle", "Explanation", "Example", "Key takeaway", "Quiz question", "Quiz options", "Correct answer", "Badge unlocked"].map((field) => (
            <label key={field}>
              <span>{field}</span>
              {field.includes("Explanation") || field.includes("Example") ? <textarea placeholder={field} /> : <input placeholder={field} />}
            </label>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <h2>Chapters</h2>
        <AdminDataTable<ChapterRow>
          columns={[
            { key: "sort_order", label: "Order" },
            { key: "title", label: "Title" },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status, "draft")}</AdminStatusBadge> },
            { key: "estimated_minutes", label: "Minutes" },
            { key: "xp_points", label: "XP" },
            { key: "quiz_question", label: "Quiz", render: (row) => (row.quiz_question ? "Present" : "Missing") },
          ]}
          rows={chapters}
        />
      </section>
    </>
  );
}
