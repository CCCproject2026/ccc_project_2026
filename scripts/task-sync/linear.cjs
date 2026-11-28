const FIELDS = 'id identifier title description url createdAt archivedAt';

function linearClient(token, fetcher = fetch) {
  if (!token) throw new Error('LINEAR_API_KEY is required');
  async function request(query, variables = {}) {
    // Do not automatically retry mutations: a timeout can follow a successful write.
    const response = await fetcher('https://api.linear.app/graphql', {
      method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Linear HTTP ${response.status}; retry the workflow after checking service limits`);
    const payload = await response.json();
    if (payload.errors?.length || !payload.data) throw new Error('Linear GraphQL request failed; check API permissions and configuration');
    return payload.data;
  }
  return {
    async list({ teamId, projectId, since }) {
      const filter = { team: { id: { eq: teamId } }, createdAt: { gte: since } };
      if (projectId) filter.project = { id: { eq: projectId } };
      const issues = [];
      let after = null;
      do {
        const data = await request(`query SyncIssues($filter: IssueFilter!, $after: String) {
          issues(first: 100, after: $after, filter: $filter, includeArchived: true, orderBy: updatedAt) {
            nodes { ${FIELDS} } pageInfo { hasNextPage endCursor }
          }
        }`, { filter, after });
        issues.push(...data.issues.nodes);
        const page = data.issues.pageInfo;
        if (page.hasNextPage && (!page.endCursor || page.endCursor === after)) throw new Error('Linear pagination did not advance');
        after = page.hasNextPage ? page.endCursor : null;
      } while (after);
      return issues;
    },
    async create(input) {
      const data = await request(`mutation SyncCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) { success issue { ${FIELDS} } }
      }`, { input });
      if (!data.issueCreate.success || !data.issueCreate.issue) throw new Error('Linear issue creation failed');
      return data.issueCreate.issue;
    },
    async attach(issueId, url) {
      const data = await request(`mutation SyncAttachment($input: AttachmentCreateInput!) {
        attachmentCreate(input: $input) { success }
      }`, { input: { issueId, url, title: 'GitHub Issue・開発準備', subtitle: '設計Template・生成ファイルはGitHub Issueを参照' } });
      if (!data.attachmentCreate.success) throw new Error('Linear attachment creation failed');
    },
  };
}

module.exports = { linearClient };
