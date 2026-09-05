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
  author: string;
  category: string;
  status: "Draft" | "Published";
  publishedDate: string;
  views: number;
  featuredImage: string;
  tags: string[];
}
