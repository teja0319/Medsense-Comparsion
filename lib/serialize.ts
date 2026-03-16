import { ObjectId } from 'mongodb';

export function serializeDocument(doc: any): any {
  if (doc === null || doc === undefined) {
    return doc;
  }

  if (doc instanceof ObjectId) {
    return doc.toString();
  }

  if (doc instanceof Date) {
    return doc.toISOString();
  }

  if (Array.isArray(doc)) {
    return doc.map(item => serializeDocument(item));
  }

  if (typeof doc === 'object') {
    const serialized: any = {};
    for (const key in doc) {
      if (doc.hasOwnProperty(key)) {
        serialized[key] = serializeDocument(doc[key]);
      }
    }
    return serialized;
  }

  return doc;
}

export function serializeDocuments(docs: any[]): any[] {
  return docs.map(doc => serializeDocument(doc));
}
