export interface BlogPostItem {
  id: string;
  slug: string;
  title: {
    en: string;
    fr: string;
  };
  excerpt: {
    en: string;
    fr: string;
  };
  content: {
    en: string;
    fr: string;
  };
  metaTitle?: {
    en: string;
    fr: string;
  };
  metaDescription?: {
    en: string;
    fr: string;
  };
  author: string;
  category: string;
  status: "Draft" | "Published";
  publishedDate: string;
  views: number;
  featuredImage: string;
  tags: string[];
  allowComments?: boolean;
  commentsCount?: number;
}

export interface BlogCommentAdminReply {
  content: string;
  repliedBy: string;
  repliedAt: string;
}

export interface BlogCommentItem {
  id: string;
  postId: string;
  postSlug: string;
  postTitle?: {
    en: string;
    fr: string;
  };
  authorName: string;
  authorEmail?: string;
  content: string;
  status: "Approved" | "Pending" | "Hidden";
  adminReply?: BlogCommentAdminReply;
  createdAt: string;
}
