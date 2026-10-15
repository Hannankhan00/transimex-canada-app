import connectDB from "@/lib/mongoose";
import ExpressTerms from "@/models/ExpressTerms";
import { DEFAULT_TERMS, DEFAULT_TERMS_VERSION, type TermsContent } from "./terms";

export interface TermsVersion {
  version: string;
  number: number;
  content: TermsContent;
  publishedByName: string;
  /** null for the built-in default. */
  publishedAt: string | null;
}

const BUILT_IN: TermsVersion = {
  version: DEFAULT_TERMS_VERSION,
  number: 1,
  content: DEFAULT_TERMS,
  publishedByName: "",
  publishedAt: null,
};

function toVersion(doc: any): TermsVersion {
  return {
    version: doc.version,
    number: doc.number,
    content: {
      en: { heading: doc.content.en.heading, intro: doc.content.en.intro, sections: doc.content.en.sections.map((s: any) => ({ title: s.title, body: s.body })) },
      fr: { heading: doc.content.fr.heading, intro: doc.content.fr.intro, sections: doc.content.fr.sections.map((s: any) => ({ title: s.title, body: s.body })) },
    },
    publishedByName: doc.publishedByName,
    publishedAt: new Date(doc.createdAt).toISOString(),
  };
}

/** The terms new applicants must accept: the newest published version, else the built-in v1. */
export async function getCurrentTerms(): Promise<TermsVersion> {
  await connectDB();
  const latest = await ExpressTerms.findOne().sort({ number: -1 }).lean();
  return latest ? toVersion(latest) : BUILT_IN;
}

/** Every version, newest first, ending with the built-in v1. */
export async function listTermsVersions(): Promise<TermsVersion[]> {
  await connectDB();
  const docs = await ExpressTerms.find().sort({ number: -1 }).lean();
  return [...docs.map(toVersion), BUILT_IN];
}

/** Publishes a new version. Retries once if two admins publish at the same moment. */
export async function publishTerms(content: TermsContent, actor: { userId: string; name: string }): Promise<TermsVersion> {
  await connectDB();
  for (let attempt = 0; attempt < 2; attempt++) {
    const latest = await ExpressTerms.findOne().sort({ number: -1 }).select("number").lean();
    const number = (latest?.number ?? 1) + 1;
    try {
      const created = await ExpressTerms.create({
        version: `v${number}`,
        number,
        content,
        publishedBy: actor.userId,
        publishedByName: actor.name,
      });
      return toVersion(created.toObject());
    } catch (error: any) {
      if (error?.code !== 11000 || attempt === 1) throw error;
    }
  }
  throw new Error("unreachable");
}
