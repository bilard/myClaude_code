import axios, { AxiosInstance } from 'axios';

const CANVA_API_BASE = 'https://api.canva.com/rest';
const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_URL = `${CANVA_API_BASE}/v1/oauth/token`;

export class CanvaService {
  private client: AxiosInstance;

  constructor(private accessToken?: string) {
    this.client = axios.create({
      baseURL: CANVA_API_BASE,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  // ─── OAuth ──────────────────────────────────────────

  static getAuthorizationUrl(clientId: string, redirectUri: string, state: string, codeChallenge: string): string {
    const scopes = [
      'asset:read', 'asset:write',
      'brandtemplate:content:read', 'brandtemplate:meta:read',
      'design:content:read', 'design:content:write',
      'design:meta:read', 'design:meta:write',
      'comment:read', 'comment:write',
      'folder:read', 'folder:write',
      'profile:read',
    ];
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${CANVA_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeToken(code: string, clientId: string, clientSecret: string, redirectUri: string, codeVerifier: string) {
    const response = await axios.post(CANVA_TOKEN_URL, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: clientId,
      client_secret: clientSecret,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  }

  static async refreshToken(refreshTokenValue: string, clientId: string, clientSecret: string) {
    const response = await axios.post(CANVA_TOKEN_URL, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenValue,
      client_id: clientId,
      client_secret: clientSecret,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  }

  // ─── User ──────────────────────────────────────────

  async getUserInfo() {
    const { data } = await this.client.get('/v1/users/me');
    return data;
  }

  async getUserProfile() {
    const { data } = await this.client.get('/v1/users/me/profile');
    return data;
  }

  async getUserCapabilities() {
    const { data } = await this.client.get('/v1/users/me/capabilities');
    return data;
  }

  // ─── Designs ──────────────────────────────────────────

  async listDesigns(query?: string, continuation?: string) {
    const params: Record<string, string> = {};
    if (query) params.query = query;
    if (continuation) params.continuation = continuation;
    const { data } = await this.client.get('/v1/designs', { params });
    return data;
  }

  async createDesign(designType: string, options?: { width?: number; height?: number; asset_id?: string; title?: string }) {
    const body: Record<string, unknown> = {};
    if (designType === 'custom' && options?.width && options?.height) {
      body.design_type = { type: 'custom', width: options.width, height: options.height };
    } else {
      body.design_type = { type: 'preset', name: designType };
    }
    if (options?.asset_id) body.asset_id = options.asset_id;
    if (options?.title) body.title = options.title;
    const { data } = await this.client.post('/v1/designs', body);
    return data;
  }

  async getDesign(designId: string) {
    const { data } = await this.client.get(`/v1/designs/${designId}`);
    return data;
  }

  async getDesignPages(designId: string) {
    const { data } = await this.client.get(`/v1/designs/${designId}/pages`);
    return data;
  }

  async getDesignExportFormats(designId: string) {
    const { data } = await this.client.get(`/v1/designs/${designId}/export-formats`);
    return data;
  }

  // ─── Templates ──────────────────────────────────────────

  async listBrandTemplates(query?: string, continuation?: string) {
    const params: Record<string, string> = {};
    if (query) params.query = query;
    if (continuation) params.continuation = continuation;
    const { data } = await this.client.get('/v1/brand-templates', { params });
    return data;
  }

  async getBrandTemplate(templateId: string) {
    const { data } = await this.client.get(`/v1/brand-templates/${templateId}`);
    return data;
  }

  async getBrandTemplateDataset(templateId: string) {
    const { data } = await this.client.get(`/v1/brand-templates/${templateId}/dataset`);
    return data;
  }

  async createAutofillJob(brandTemplateId: string, title: string, data: Record<string, unknown>) {
    const response = await this.client.post('/v1/autofills', {
      brand_template_id: brandTemplateId,
      title,
      data,
    });
    return response.data;
  }

  async getAutofillJob(jobId: string) {
    const { data } = await this.client.get(`/v1/autofills/${jobId}`);
    return data;
  }

  // ─── Assets ──────────────────────────────────────────

  async getAsset(assetId: string) {
    const { data } = await this.client.get(`/v1/assets/${assetId}`);
    return data;
  }

  async updateAsset(assetId: string, name?: string, tags?: string[]) {
    const body: Record<string, unknown> = {};
    if (name) body.name = name;
    if (tags) body.tags = tags;
    const { data } = await this.client.patch(`/v1/assets/${assetId}`, body);
    return data;
  }

  async deleteAsset(assetId: string) {
    await this.client.delete(`/v1/assets/${assetId}`);
  }

  async createAssetUpload(file: Buffer, metadata: { name: string; tags?: string[] }) {
    const { data } = await this.client.post('/v1/asset-uploads', file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Asset-Upload-Metadata': JSON.stringify(metadata),
      },
    });
    return data;
  }

  async getAssetUploadJob(jobId: string) {
    const { data } = await this.client.get(`/v1/asset-uploads/${jobId}`);
    return data;
  }

  async createUrlAssetUpload(url: string, name: string, tags?: string[]) {
    const { data } = await this.client.post('/v1/url-asset-uploads', { url, name, tags });
    return data;
  }

  async getUrlAssetUploadJob(jobId: string) {
    const { data } = await this.client.get(`/v1/url-asset-uploads/${jobId}`);
    return data;
  }

  // ─── Folders ──────────────────────────────────────────

  async createFolder(name: string, parentFolderId?: string) {
    const body: Record<string, unknown> = { name };
    if (parentFolderId) body.parent_folder_id = parentFolderId;
    const { data } = await this.client.post('/v1/folders', body);
    return data;
  }

  async getFolder(folderId: string) {
    const { data } = await this.client.get(`/v1/folders/${folderId}`);
    return data;
  }

  async updateFolder(folderId: string, name: string) {
    const { data } = await this.client.patch(`/v1/folders/${folderId}`, { name });
    return data;
  }

  async deleteFolder(folderId: string) {
    await this.client.delete(`/v1/folders/${folderId}`);
  }

  async listFolderItems(folderId: string, continuation?: string) {
    const params: Record<string, string> = {};
    if (continuation) params.continuation = continuation;
    const { data } = await this.client.get(`/v1/folders/${folderId}/items`, { params });
    return data;
  }

  async moveFolderItem(folderId: string, itemId: string) {
    await this.client.post('/v1/folders/move', { folder_id: folderId, item_id: itemId });
  }

  // ─── Exports ──────────────────────────────────────────

  async createExportJob(designId: string, format: string, options?: { quality?: string; pages?: number[] }) {
    const body: Record<string, unknown> = {
      design_id: designId,
      format: { type: format },
    };
    if (options?.quality) (body.format as Record<string, unknown>).quality = options.quality;
    if (options?.pages) (body.format as Record<string, unknown>).pages = options.pages;
    const { data } = await this.client.post('/v1/exports', body);
    return data;
  }

  async getExportJob(exportId: string) {
    const { data } = await this.client.get(`/v1/exports/${exportId}`);
    return data;
  }

  // ─── Design Import ──────────────────────────────────────────

  async createDesignImport(file: Buffer, metadata: { title?: string }) {
    const { data } = await this.client.post('/v1/imports', file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Import-Metadata': JSON.stringify(metadata),
      },
    });
    return data;
  }

  async getDesignImportJob(jobId: string) {
    const { data } = await this.client.get(`/v1/imports/${jobId}`);
    return data;
  }

  async createUrlImport(url: string, fileName: string) {
    const { data } = await this.client.post('/v1/url-imports', { url, file_name: fileName });
    return data;
  }

  async getUrlImportJob(jobId: string) {
    const { data } = await this.client.get(`/v1/url-imports/${jobId}`);
    return data;
  }

  // ─── Resize ──────────────────────────────────────────

  async createResizeJob(designId: string, designType: string, options?: { width?: number; height?: number }) {
    const body: Record<string, unknown> = { design_id: designId };
    if (designType === 'custom' && options?.width && options?.height) {
      body.design_type = { type: 'custom', width: options.width, height: options.height };
    } else {
      body.design_type = { type: 'preset', name: designType };
    }
    const { data } = await this.client.post('/v1/resizes', body);
    return data;
  }

  async getResizeJob(jobId: string) {
    const { data } = await this.client.get(`/v1/resizes/${jobId}`);
    return data;
  }

  // ─── Comments ──────────────────────────────────────────

  async createThread(designId: string, message: string, x?: number, y?: number, pageNumber?: number) {
    const body: Record<string, unknown> = { message };
    if (x !== undefined) body.x = x;
    if (y !== undefined) body.y = y;
    if (pageNumber !== undefined) body.page_number = pageNumber;
    const { data } = await this.client.post(`/v1/designs/${designId}/comments`, body);
    return data;
  }

  async getThread(designId: string, threadId: string) {
    const { data } = await this.client.get(`/v1/designs/${designId}/comments/${threadId}`);
    return data;
  }

  async createReply(designId: string, threadId: string, message: string) {
    const { data } = await this.client.post(`/v1/designs/${designId}/comments/${threadId}/replies`, { message });
    return data;
  }

  async listReplies(designId: string, threadId: string) {
    const { data } = await this.client.get(`/v1/designs/${designId}/comments/${threadId}/replies`);
    return data;
  }
}
