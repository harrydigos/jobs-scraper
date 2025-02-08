import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { jobs } from './schema';

export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;
