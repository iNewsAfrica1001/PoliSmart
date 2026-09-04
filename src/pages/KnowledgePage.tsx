import { FileText, Search, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "../lib/auth";
import { knowledgeApi, type KnowledgeDocument } from "../lib/knowledge";
import { operationsApi } from "../lib/operations";

export function KnowledgePage({ user }: { user: SessionUser }) {
  const tenantId = user.memberships[0]?.tenantId ?? "";
  const canApprove =
    user.memberships.find((item) => item.tenantId === tenantId)?.canApproveKnowledge === true;
  const [approving, setApproving] = useState(false);
  const [notice, setNotice] = useState("");
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [campaignId, setCampaignId] = useState("");
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const load = useCallback(async () => {
    if (!campaignId) return;
    try {
      setDocuments((await knowledgeApi.list(tenantId, campaignId, query)).documents);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load documents.");
    }
  }, [tenantId, campaignId, query]);
  useEffect(() => {
    operationsApi
      .campaigns(tenantId)
      .then(({ campaigns: items }) => {
        setCampaigns(items);
        setCampaignId((current) => current || items[0]?.id || "");
      })
      .catch(() => setError("Unable to load campaigns."));
  }, [tenantId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("campaignId", campaignId);
    try {
      await knowledgeApi.upload(tenantId, data);
      form.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="knowledge-page">
      <header className="knowledge-heading">
        <div>
          <span className="eyebrow">SECURE CAMPAIGN LIBRARY</span>
          <h1>Knowledge base</h1>
          <p>Validated, searchable source material for your campaign team.</p>
        </div>
        <span>
          <ShieldCheck /> Tenant isolated
        </span>
      </header>
      <p>Upload → READY/DRAFT → Authorized Approval → APPROVED → Available for grounded AI.</p>
      <p>
        READY means processing is complete, not approved. Approved documents are eligible for AI
        retrieval when relevant to the question and permitted campaign context.
      </p>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      <div className="knowledge-layout">
        <form className="upload-card" onSubmit={upload}>
          <Upload />
          <h2>Upload document</h2>
          <p>PDF, DOCX, TXT, or CSV · 10 MB maximum</p>
          <label>
            Campaign
            <select
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
              required
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Document
            <input name="document" type="file" accept=".pdf,.docx,.txt,.csv" required />
          </label>
          <label>
            Title
            <input name="title" required maxLength={200} />
          </label>
          <label>
            Category
            <select name="category">
              {[
                "MANIFESTO",
                "POLICY",
                "SPEECH",
                "RESEARCH",
                "CAMPAIGN_MANUAL",
                "STRATEGY",
                "APPROVED_COMMUNICATION",
                "PUBLIC_REPORT",
              ].map((category) => (
                <option key={category}>{category.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label>
            Source
            <input name="source" />
          </label>
          <label>
            Author
            <input name="author" />
          </label>
          <label>
            Tags
            <input name="tags" placeholder="economy, health" />
          </label>
          <label>
            Visibility
            <select name="visibility">
              <option>CAMPAIGN</option>
              <option>PRIVATE</option>
              <option>ORGANIZATION</option>
              <option>PUBLIC</option>
            </select>
          </label>
          <button className="primary-action" disabled={uploading || !campaignId}>
            {uploading ? "Processing…" : "Upload and process"}
          </button>
        </form>
        <section className="library-card">
          <div className="library-tools">
            <div>
              <h2>Campaign documents</h2>
              <span>{documents.length} documents</span>
            </div>
            <label>
              <Search />
              <span className="sr-only">Search documents</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, text, or tag"
              />
            </label>
          </div>
          <div className="document-list">
            {documents.map((document) => (
              <article key={document.id}>
                <span className="document-icon">
                  <FileText />
                </span>
                <div>
                  <strong>{document.title}</strong>
                  <small>
                    {document.category.replaceAll("_", " ")} ·{" "}
                    {document.author || "Author not provided"}
                  </small>
                  <div>
                    {document.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="document-state">
                  <span>{document.processingStatus}</span>
                  <small>{document.approvalStatus}</small>
                  {document.approvalStatus !== "APPROVED" && (
                    <p>Awaiting approval before this document can be used by AI Assistant.</p>
                  )}
                  {canApprove &&
                    document.processingStatus === "READY" &&
                    document.approvalStatus !== "APPROVED" && (
                      <button
                        type="button"
                        disabled={approving}
                        onClick={async () => {
                          if (!canApprove || approving) return;
                          if (
                            !window.confirm(
                              `Approve "${document.title}" for grounded AI use? Confirm that you have reviewed its content.`,
                            )
                          )
                            return;
                          setApproving(true);
                          setError("");
                          setNotice("");
                          try {
                            await knowledgeApi.approve(tenantId, document.id);
                            await load();
                            setNotice("Document approved and eligible for grounded AI retrieval.");
                          } catch {
                            setError(
                              "Unable to approve this document. Check your approval access and try again.",
                            );
                          } finally {
                            setApproving(false);
                          }
                        }}
                      >
                        Approve {document.title} for AI
                      </button>
                    )}
                </div>
                <button
                  onClick={async () => {
                    try {
                      await knowledgeApi.remove(tenantId, document.id);
                      await load();
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : "Deletion failed.");
                    }
                  }}
                  aria-label={`Delete ${document.title}`}
                >
                  <Trash2 />
                </button>
              </article>
            ))}
            {!documents.length && (
              <div className="empty-state">
                <FileText />
                <h3>No documents found</h3>
                <p>Upload a validated campaign document or adjust your search.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
