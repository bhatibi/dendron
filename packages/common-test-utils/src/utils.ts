import {
  DEngineClientV2,
  DEngineInitRespV2,
  DLink,
  DNodeTypeV2,
  EngineDeleteOptsV2,
  EngineUpdateNodesOptsV2,
  EngineWriteOptsV2,
  GetNoteOptsV2,
  NotePropsDictV2,
  NotePropsV2,
  QueryOptsV2,
  RenameNoteOptsV2,
  SchemaModuleDictV2,
  SchemaModulePropsV2,
} from "@dendronhq/common-all";
import { DendronAPI } from "@dendronhq/common-server";
import { TestResult } from "./types";

export class EngineAPIShim implements DEngineClientV2 {
  public api: DendronAPI;
  public wsRoot: string;
  public vaults: string[];
  public notes: NotePropsDictV2;
  public schemas: SchemaModuleDictV2;
  public links: DLink[];

  constructor({
    api,
    wsRoot,
    vaults,
  }: {
    api: DendronAPI;
    wsRoot: string;
    vaults: string[];
  }) {
    this.api = api;
    this.wsRoot = wsRoot;
    this.vaults = vaults;
    this.notes = {};
    this.schemas = {};
    this.links = [];
  }
  async init() {
    const { api, wsRoot, vaults } = this;
    const vault = vaults[0];
    const payload = {
      uri: wsRoot,
      config: {
        vaults: [vault],
      },
    };
    const resp = await api.workspaceInit(payload);
    return resp as DEngineInitRespV2;
  }

  async deleteNote(_id: string, _opts?: EngineDeleteOptsV2) {
    return {} as any;
  }
  async deleteSchema(_id: string, _opts?: EngineDeleteOptsV2) {
    return {} as any;
  }

  async getNoteByPath(_opts: GetNoteOptsV2) {
    return {} as any;
  }
  async getSchema(_qs: string) {
    return {} as any;
  }

  async querySchema(_qs: string) {
    return {} as any;
  }
  async queryNotes?(_qs: string) {
    return {} as any;
  }

  async query(_queryString: string, _mode: DNodeTypeV2, _opts?: QueryOptsV2) {
    return {} as any;
  }

  async renameNote(opts: RenameNoteOptsV2) {
    return await this.api.engineRenameNote({ ws: this.wsRoot, ...opts });
  }

  async updateNote(note: NotePropsV2, opts?: EngineUpdateNodesOptsV2) {
    await this.api.engineUpdateNote({ ws: this.wsRoot, note, opts });
    return;
  }

  async writeNote(note: NotePropsV2, opts?: EngineWriteOptsV2) {
    const resp = await this.api.engineWrite({
      ws: this.wsRoot,
      node: note,
      opts,
    });
    return resp;
  }
  async writeSchema(_schema: SchemaModulePropsV2) {
    return {} as any;
  }
  async updateSchema(_schema: SchemaModulePropsV2) {
    return {} as any;
  }
}

export class TestPresetEntry<TBeforeOpts, TAfterOpts, TResultsOpts> {
  public label: string;
  public before: (_opts: TBeforeOpts) => Promise<any>;
  public after: (_opts: TAfterOpts) => Promise<any>;
  public results: (_opts: TResultsOpts) => Promise<TestResult[]>;
  public init: () => Promise<void>;

  constructor({
    label,
    results,
    before,
    after,
  }: {
    label: string;
    before?: (_opts: TBeforeOpts) => Promise<any>;
    after?: (_opts: TAfterOpts) => Promise<any>;
    results: (_opts: TResultsOpts) => Promise<TestResult[]>;
    //init?: ({engine}: {engine: DEngineV2}) => Promise<void>;
  }) {
    this.label = label;
    this.results = results;
    this.before = before ? before : async () => {};
    this.after = after ? after : async () => {};
    this.init = async () => {};
  }
}
