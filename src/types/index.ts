export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  canvaUserId?: string;
  canvaConnected: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Design {
  id: string;
  canvaDesignId?: string;
  title: string;
  description?: string;
  designType: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  editUrl?: string;
  viewUrl?: string;
  status: string;
  tags?: string;
  userId: string;
  folderId?: string;
  folder?: Folder;
  pages?: DesignPage[];
  comments?: Comment[];
  exports?: Export[];
  _count?: { comments: number; exports: number };
  createdAt: string;
  updatedAt: string;
}

export interface DesignPage {
  id: string;
  designId: string;
  pageNumber: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface Template {
  id: string;
  canvaTemplateId?: string;
  name: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  datasetFields?: string;
  isPublic: boolean;
  usageCount: number;
  tags?: string;
  userId: string;
  templateDesigns?: TemplateDesign[];
  _count?: { templateDesigns: number };
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDesign {
  id: string;
  templateId: string;
  designId: string;
  autofillData?: string;
  design?: Design;
  createdAt: string;
}

export interface Asset {
  id: string;
  canvaAssetId?: string;
  name: string;
  type: string;
  mimeType?: string;
  size?: number;
  url?: string;
  thumbnailUrl?: string;
  tags?: string;
  folderId?: string;
  userId: string;
  uploadStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  canvaFolderId?: string;
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
  userId: string;
  parent?: Folder;
  children?: Folder[];
  designs?: Design[];
  assets?: Asset[];
  _count?: { children: number; designs: number; assets: number };
  createdAt: string;
  updatedAt: string;
}

export interface Export {
  id: string;
  canvaExportId?: string;
  designId: string;
  userId: string;
  format: string;
  quality?: string;
  status: string;
  downloadUrl?: string;
  fileSize?: number;
  errorMessage?: string;
  expiresAt?: string;
  design?: { title: string; thumbnailUrl?: string };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  canvaThreadId?: string;
  designId: string;
  userId: string;
  message: string;
  parentId?: string;
  positionX?: number;
  positionY?: number;
  pageNumber?: number;
  status: string;
  user?: { displayName: string; avatar?: string };
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  totalPages: number;
  [key: string]: T[] | number;
}

export interface DashboardStats {
  counts: {
    designs: number;
    templates: number;
    assets: number;
    exports: number;
    comments: number;
    folders: number;
  };
  recentDesigns: Design[];
  recentExports: Export[];
}
