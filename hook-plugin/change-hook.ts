import type { Schema, Document } from 'mongoose';
import { Query } from 'mongoose';
import type { Request, Response, NextFunction } from 'express';
import httpContext from 'express-http-context';

function contextSetterMiddleware(req: Request, res: Response, next: NextFunction) {
  httpContext.set('test', 'hi');
  next();
}

function getContext(): { test: string } | undefined {
  const test = httpContext.get('test');
  if (!test) return undefined;
  return {
    test,
  };
}

const changeHookPlugin = <SchemaType>(args: {
  modelName: string;
  filterProps: Array<keyof SchemaType>;
  onChange: (args: { mode: 'insert' | 'update' | 'remove', context: ReturnType<typeof getContext>, docs: any[] }) => void
}) => (schema: Schema) => {
  // schame.post だと context が受け取れないので、pre で送っておく
  ['save', 'insertMany', 'updateOne', 'findOneAndUpdate', 'update', 'updateMany'].forEach(
    method => {
      schema.pre(method, function () {
        (this as any).__CONTEXT = getContext();
      });
    },
  );

  // create
  schema.post('save', function (doc: Document & { name?: string }) {
    if (!doc) return;
    const context = (this as any).__CONTEXT as ReturnType<typeof getContext>;
    if (!context) return;
    args.onChange({
      mode: 'insert',
      context,
      docs: [doc],
    });
  });

  schema.post('insertMany', function (docs: Document[]) {
    if (docs.length === 0) return;
    const context = (this as any).__CONTEXT as ReturnType<typeof getContext>;
    if (!context) return;
    args.onChange({
      mode: 'insert',
      context,
      docs: docs,
    });
  });

  // update
  ['updateOne', 'findOneAndUpdate', 'update', 'updateMany'].forEach(method => {
    schema.post(method, async function (_, next) {
      try {
        const isQueryMiddleware = this instanceof Query;
        if (!isQueryMiddleware) return;

        const context = (this as any).__DEPLOY_CONTEXT as ReturnType<typeof getContext>;
        if (!context) return;

        // filtering updating properties.
        const updateQuery = this.getUpdate();
        const sets = updateQuery['$set'] || {};
        const isFiltered = args.filterProps.some(prop => {
          return sets.hasOwnProperty(prop);
        });
        if (!isFiltered) return;

        // 更新したやつを取得しておく
        const updatedDocs: (Document & { name?: string })[] = await this.find(this.getFilter()).exec();
        // ここで next 呼んでおく
        next(null);

        args.onChange({
          mode: 'update',
          context,
          docs: updatedDocs,
        });

      } catch (e) {
        next(e);
      }
    });
  });

  // remove
  ['remove', 'deleteOne', 'findOneAndRemove', 'findOneAndDelete', 'deleteMany'].forEach(method => {
    // 削除する前に送っておく
    schema.pre(method, async function (next) {
      try {
        const isQueryMiddleware = this instanceof Query;
        if (!isQueryMiddleware) return;

        const context = getContext();
        if (!context) return;

        // delete される document をここで取得しとく
        const removedDocs: (Document & {
          name?: string;
        })[] = await (this as any).model
          .find(this.getFilter())
          .exec();
        // ここで next 呼んでおく
        next(null);

        args.onChange({
          mode: 'update',
          context,
          docs: removedDocs,
        });

      } catch (e) {
        next(e);
      }
    });
  });
};

export { changeHookPlugin, contextSetterMiddleware };
