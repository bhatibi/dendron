import { DendronError, DEngineV2 } from "@dendronhq/common-all";
import {
  SchemaDeletePayload,
  SchemaDeleteRequest,
  SchemaQueryPayload,
  SchemaQueryRequest,
  SchemaUpdatePayload,
  SchemaUpdateRequest,
  SchemaWritePayload,
  SchemaWriteRequest,
} from "@dendronhq/common-server";
import { DendronEngineV2 } from "@dendronhq/engine-server";
import { MemoryStore } from "../../store/memoryStore";

export class SchemaController {
  static singleton?: SchemaController;

  static instance() {
    if (!SchemaController.singleton) {
      SchemaController.singleton = new SchemaController();
    }
    return SchemaController.singleton;
  }

  async create(req: SchemaWriteRequest): Promise<SchemaWritePayload> {
    const { ws, schema } = req;
    const engine = await MemoryStore.instance().get<DEngineV2>(`ws:${ws}`);
    if (!engine) {
      throw "No Engine";
    }
    try {
      await engine.writeSchema(schema);
      return { error: null, data: undefined };
    } catch (err) {
      return {
        error: new DendronError({ msg: JSON.stringify(err) }),
        data: undefined,
      };
    }
  }

  async delete({
    ws,
    id,
    opts,
  }: SchemaDeleteRequest): Promise<SchemaDeletePayload> {
    const engine = await MemoryStore.instance().get<DEngineV2>(`ws:${ws}`);
    if (!engine) {
      throw "No Engine";
    }
    try {
      const data = await engine.deleteSchema(id, opts);
      return data;
    } catch (err) {
      return {
        error: new DendronError({ msg: JSON.stringify(err) }),
        data: undefined,
      };
    }
  }

  async query({ ws, qs }: SchemaQueryRequest): Promise<SchemaQueryPayload> {
    const engine = await MemoryStore.instance().get<DendronEngineV2>(
      `ws:${ws}`
    );
    if (!engine) {
      throw "No Engine";
    }
    return await engine.querySchema(qs);
  }

  async update({
    ws,
    schema,
  }: SchemaUpdateRequest): Promise<SchemaUpdatePayload> {
    const engine = await MemoryStore.instance().get<DEngineV2>(`ws:${ws}`);
    if (!engine) {
      throw "No Engine";
    }
    try {
      await engine.updateSchema(schema);
      return { error: null };
    } catch (err) {
      return {
        error: new DendronError({ msg: JSON.stringify(err) }),
        data: undefined,
      };
    }
  }
}
