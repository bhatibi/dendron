import { Note, NoteRawProps, NoteUtilsV2 } from "@dendronhq/common-all";
import fs from "fs-extra";
import _ from "lodash";
import { URI } from "vscode-uri";
import { TwitThread } from "twit-thread";

// some of this might need to be changed
import {
  ExportConfig,
  ExportPod,
  ExportPodBaseV2,
  ExportPodOpts,
  ImportConfig,
  ImportPodBaseV2,
  ImportPodOpts,
  PodConfigEntry,
  PublishConfig,
  PublishPodBaseV3,
  PublishPodOpts,
} from "../base";

const ID = "dendron.pod.twitter";

// this may or may not need to be changed
export type ImportPodConfig = ImportConfig & {
  concatenate: boolean;
  destName?: string;
};

// see if this import class needs to be changed or if it needs to extend from a different base class
export class TwitterImportPod extends ImportPodBaseV2<ImportPodConfig> {
  static id: string = ID;
  static description: string = "import pod to tweet";

  static config = (): PodConfigEntry[] => {
    return [
      {
        key: "src",
        description: "where will notes be imported from",
        type: "string",
      },
      {
        key: "concatenate",
        description:
          "concatenate all entries into one note? if set to true, need to set `destName`",
        type: "boolean",
        default: false,
      },
      // this might need to be changed for the twitter case or might not be needed at all
      {
        key: "destName",
        description:
          "if `concatenate: true`, specify name of concatenated note",
        type: "string",
      },
      // check to see how this needs to be changed for Twitter
      {
        key: "twitterConfig",
        description: "Location of Twitter config file",
        type: "string",
      },
    ];
  };

  async plant(opts: ImportPodOpts<ImportPodConfig>): Promise<void> {
    const cleanConfig = this.cleanConfig(opts.config);
    await this.prepare(opts);
    await this.execute({ ...opts.config, ...cleanConfig });
  }

  async execute(opts: { src: URI } & Omit<ImportPodConfig, "src">) {
    //const ctx = "JSONPod";
    const ctx = "TwitterPod";
    this.L.info({ ctx, opts, msg: "enter" });
    const { src, destName, concatenate } = opts;
    const entries = fs.readJSONSync(src.fsPath);
    const notes = await this._entries2Notes(entries, { destName, concatenate });
    return Promise.all(
      _.map(notes, (n) =>
        this.engine.write(n, { newNode: true, parentsAsStubs: true })
      )
    );
  }

  async _entries2Notes(
    entries: Partial<NoteRawProps>[],
    opts: Pick<ImportPodConfig, "concatenate" | "destName">
  ): Promise<Note[]> {
    const notes = _.map(entries, (ent) => {
      if (!ent.fname) {
        throw Error("fname not defined");
      }
      let fname = ent.fname;
      return new Note({ ...ent, fname, parent: null, children: [] });
    });
    if (opts.concatenate) {
      if (!opts.destName) {
        throw Error(
          "destname needs to be specified if concatenate is set to true"
        );
      }
      const acc: string[] = [""];
      _.forEach(notes, (n) => {
        acc.push(`# [[${n.fname}]]`);
        acc.push(n.renderBody());
        acc.push("---");
      });
      return [new Note({ fname: opts.destName, body: acc.join("\n") })];
    } else {
      return notes;
    }
  }
}

// this might need to extend a different base class
export class TwitterPublishPod extends PublishPodBaseV3<PublishConfig> {
  static id: string = ID;
  static description: string = "publish to twitter";

  static config = (): PodConfigEntry[] => {
    return [
      {
        key: "dest",
        description: "where will output be stored",
        type: "string",
      },
    ];
  };

  // this should be replaced by the method below to publish to Twitter
  async plant(opts: PublishPodOpts<PublishConfig>): Promise<void> {
    await this.initEngine();
    const { dest } = _.defaults(opts.config, { dest: null });
    const { fname } = opts;
    const note = NoteUtilsV2.getNoteByFname(fname, this.engine.notes, {
      throwIfEmpty: true,
    });
    if (dest) {
      fs.writeJSONSync(dest, note, { encoding: "utf8" });
    } else {
      console.log(note);
    }
  }
}

// We probably don't need this as we will be "publishing" a tweet and not exporting it to anything
// we need publish only
export class TwitterExportPod extends ExportPodBaseV2
  implements ExportPod<ExportConfig> {
  static id: string = ID;
  static description: string = "export to twitter";

  static config = (): PodConfigEntry[] => {
    return [
      {
        key: "dest",
        description: "where will output be stored",
        type: "string",
      },
    ];
  };

  // this will be the function that posts to Twitter using API ?
  // This method should probably replace the plant method in TwitterPublishPod class
  // but keeping it here for now
  // publishing as a thread or a tweet could be an option
  // Going above 250 chars should  tell you about that
  // if it failes then tells us why it fails -- make sure the note is less than 250 chars
  async plant(opts: ExportPodOpts<ExportConfig>): Promise<void> {
    await this.initEngine();

    // this could be a replacement for destConfig below
    // Keeping it here for now
    //const cleanConfig = this.cleanConfig(opts.config);

    const payload = this.prepareForExport(opts);

    // add destConfig here?
    // this will go away
    //const destPath = cleanConfig.dest.fsPath;

    // this is what Twitter config will look like:
    // standardize this into a type or something or read it from a file
    const destConfig = {
      consumer_key: "...",
      consumer_secret: "...",
      access_token: "...",
      access_token_secret: "...",
      timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
      strictSSL: true, // optional - requires SSL certificates to be valid.
    };

    // this will go away
    //fs.writeJSONSync(destPath, payload, { encoding: "utf8" });

    // https://www.npmjs.com/package/twit-thread
    //publishToTwitterAsync(destConfig, payload, { encoding: "utf8" });
    const t = new TwitThread(destConfig);
    console.log(`TwitThread instance details: ${t}`);
    // sample tweetThread call
    //await t.tweetThread([{text: "hey 1/3"}, {text: "this is a thread 2/3"}, {text: "bye 3/3"}]);

    // call to tweet the payload
    // ToDo: Add logic to automatically break the longer notes into smaller tweets and/or
    // add a config parameter for same
    console.log(`Payload to tweet: ${payload}`);
    await t.tweetThread(payload);
  }
}
