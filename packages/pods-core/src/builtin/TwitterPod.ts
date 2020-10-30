import { Note, NoteRawProps, NoteUtilsV2 } from "@dendronhq/common-all";
import fs from "fs-extra";
import _ from "lodash";
import { URI } from "vscode-uri";
import { TwitThread } from "twit-thread";

// some of this might need to be changed
import {
  ImportConfig,
  ImportPodBaseV2,
  ImportPodOpts,
  PodConfigEntry,
  PublishConfig,
  PublishPodBaseV3,
  PublishPodOpts,
} from "../base";

const ID = "dendron.twitter";

// this may or may not need to be changed
// changing the name here else index.ts of builtin is complaining because of
// an export with same name in JSONPod.ts
export type ImportTwitterPodConfig = ImportConfig & {
  concatenate: boolean;
  destName?: string;
};

// see if this import class needs to be changed or if it needs to extend from a different base class
export class TwitterImportPod extends ImportPodBaseV2<ImportTwitterPodConfig> {
  static id: string = ID;
  static description: string = "import pod to tweet";

  static config = (): PodConfigEntry[] => {
    return [
      {
        key: "src",
        description: "where will notes be imported from",
        type: "string",
      },
      // see what does this do or if it is needed for the publish to Twitter case
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

  async plant(opts: ImportPodOpts<ImportTwitterPodConfig>): Promise<void> {
    const cleanConfig = this.cleanConfig(opts.config);
    await this.prepare(opts);
    await this.execute({ ...opts.config, ...cleanConfig });
  }

  async execute(opts: { src: URI } & Omit<ImportTwitterPodConfig, "src">) {
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
    opts: Pick<ImportTwitterPodConfig, "concatenate" | "destName">
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
// this is the only class we need to TwitterPublish since we don't need
// an export for twitter
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

  // this will be the function that posts to Twitter using API ?
  // This method should probably replace the plant method in TwitterPublishPod class
  // but keeping it here for now
  // publishing as a thread or a tweet could be an option
  // Going above 250 chars should  tell you about that
  // if it failes then tells us why it fails -- make sure the note is less than 250 chars
  async plant(opts: PublishPodOpts<PublishConfig>): Promise<void> {
    await this.initEngine();

    // this could be a replacement for destConfig below
    // Keeping it here for now
    //const cleanConfig = this.cleanConfig(opts.config);

    // this does not seem to be working
    //const payload = this.prepareForExport(opts);
    // find a way to get the payload to publish to twitter

    const { fname, config } = opts;
    const note = NoteUtilsV2.getNoteByFname(fname, this.engine.notes, {
      throwIfEmpty: true,
    });

    // get the payload to tweet from note

    console.log(opts);
    console.log(`Config from opts:`);
    console.log(config);
    //console.log(`Mode from opts: ${mode}`);

    const payload = note?.body; // see if we need another property of note

    console.log(`Payload to tweet: ${payload}`);

    // this is what Twitter config will look like:
    // standardize this into a type or something or read it from a file
    // ideally we want to read it from a yml config file
    try {
      // DO NOT PUSH TO GIT WITH API KEYS
      const destConfig = {
        consumer_key: "",
        consumer_secret: "",
        access_token: "",
        access_token_secret: "",
        timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
        strictSSL: true, // optional - requires SSL certificates to be valid.
      };

      // https://www.npmjs.com/package/twit-thread
      const t = new TwitThread(destConfig);
      // call to tweet the payload
      let dateTime = new Date().getTime();

      // adding timestamp to tweet to avoid Status is a duplicate error from Twitter API
      // https://stackoverflow.com/questions/36971860/duplicate-status-error-when-tweeting-using-twitter-api
      await t.tweetThread([
        { text: `Dendron Tweet @[${dateTime}] : ${payload}` },
      ]);
      console.log(`Note tweeted succesfully`);
    } catch (e) {
      if (e instanceof Error) {
        console.error(e.message);
      } else {
        throw e;
      }
    }
  }
}
