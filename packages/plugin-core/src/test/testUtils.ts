import _ from "lodash";
import path from "path";
// // You can import and use all API from the 'vscode' module
// // as well as import your extension to test it
import * as vscode from "vscode";
import {
  SetupWorkspaceCommand,
  SetupWorkspaceOpts,
} from "../commands/SetupWorkspace";
import { CONFIG } from "../constants";
import { _activate } from "../_extension";
import {
  HistoryEvent,
  HistoryEventAction,
  HistoryService,
} from "../services/HistoryService";
import { DendronWorkspace } from "../workspace";
import { DendronQuickPickerV2 } from "../components/lookup/LookupProvider";
import { DNodePropsQuickInputV2 } from "@dendronhq/common-all";
import { VSCodeUtils } from "../utils";

export function getActiveEditorBasename() {
  return path.basename(
    VSCodeUtils.getActiveTextEditor()?.document.uri.fsPath as string
  );
}

function createMockConfig(settings: any): vscode.WorkspaceConfiguration {
  const _settings = settings;
  return {
    get: (_key: string) => {
      return _.get(_settings, _key);
    },
    update: async (_key: string, _value: any) => {
      _.set(_settings, _key, _value);
    },
    has: (key: string) => {
      return _.has(_settings, key);
    },
    inspect: (_section: string) => {
      return _settings;
    },
  };
}

type QuickPickOpts = Partial<{
  value: string;
  selectedItems: DNodePropsQuickInputV2[];
}>;

export function createMockQuickPick({
  value,
  selectedItems = [],
}: QuickPickOpts): vscode.QuickPick<DNodePropsQuickInputV2> {
  const qp = vscode.window.createQuickPick<DNodePropsQuickInputV2>();
  if (value) {
    qp.value = value;
  }
  qp.items = selectedItems;
  qp.selectedItems = selectedItems;
  return qp as DendronQuickPickerV2;
}

export function setupWorkspace(
  root: string,
  opts?: { lsp?: boolean; configOverride?: any }
) {
  DendronWorkspace.configuration = () => {
    const config: any = {
      dendron: {
        rootDir: ".",
        useExperimentalLSPSupport: opts?.lsp ? true : false,
      },
    };
    if (_.isUndefined(opts?.lsp)) {
      config[CONFIG.REVERT_SERVER_MODE.key] = true;
    }
    _.forEach(CONFIG, (ent) => {
      // @ts-ignore
      if (ent.default) {
        // @ts-ignore
        _.set(config, ent.key, ent.default);
      }
    });
    _.forEach(opts?.configOverride || {}, (v, k) => {
      _.set(config, k, v);
    });
    return createMockConfig(config);
  };
  DendronWorkspace.workspaceFile = () => {
    return vscode.Uri.file(path.join(root, "dendron.code-workspace"));
  };
  DendronWorkspace.workspaceFolders = () => {
    const uri = vscode.Uri.file(path.join(root, "vault"));
    return [{ uri, name: "vault", index: 0 }];
  };
  return { workspaceFolders: DendronWorkspace.workspaceFolders() };
}

export async function setupDendronWorkspace(
  rootDir: string,
  ctx: vscode.ExtensionContext,
  opts?: {
    configOverride?: any;
    setupWsOverride?: Partial<SetupWorkspaceOpts>;
    useCb?: (vaultPath: string) => Promise<void>;
    activateWorkspace?: boolean;
    lsp?: boolean;
  }
) {
  const optsClean = _.defaults(opts, {
    configOverride: {},
    setupWsOverride: {
      skipConfirmation: true,
      emptyWs: true,
    },
    useCb: (_vaultPath: string) => {},
    activateWorkspace: false,
    lsp: false,
  });

  if (optsClean.activateWorkspace) {
    DendronWorkspace.isActive = () => true;
  }

  const { workspaceFolders } = setupWorkspace(rootDir, {
    configOverride: optsClean.configOverride,
    lsp: optsClean.lsp,
  });
  const wsFolder = (workspaceFolders as vscode.WorkspaceFolder[])[0];
  await new SetupWorkspaceCommand().execute({
    rootDirRaw: rootDir,
    skipOpenWs: true,
    ...optsClean.setupWsOverride,
  });
  await optsClean.useCb(wsFolder.uri.fsPath);
  await _activate(ctx);
  return {
    vaultPath: wsFolder.uri.fsPath,
  };
}

/**
 * DEPRECATE
 * doesn't mean workspace is active, just that we're done with the
 * welcome message
 * @param cb
 */
export function onWSActive(cb: Function) {
  HistoryService.instance().subscribe(
    "extension",
    async (_event: HistoryEvent) => {
      if (_event.action === "activate") {
        await cb();
      }
    }
  );
}

export function onWSInit(cb: Function) {
  HistoryService.instance().subscribe(
    "extension",
    async (_event: HistoryEvent) => {
      if (_event.action === "initialized") {
        await cb();
      }
    }
  );
}

export function onExtension({
  action,
  cb,
}: {
  action: HistoryEventAction;
  cb: Function;
}) {
  HistoryService.instance().subscribe(
    "extension",
    async (_event: HistoryEvent) => {
      if (_event.action === action) {
        await cb();
      }
    }
  );
}

export function onWatcher({
  action,
  cb,
}: {
  action: HistoryEventAction;
  cb: Function;
}) {
  HistoryService.instance().subscribe(
    "watcher",
    async (_event: HistoryEvent) => {
      if (_event.action === action) {
        await cb();
      }
    }
  );
}

export const TIMEOUT = 60 * 1000 * 5;
