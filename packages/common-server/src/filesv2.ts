import {
  DNodeUtilsV2,
  DVault,
  NotePropsV2,
  NoteUtilsV2,
  SchemaModuleOptsV2,
  SchemaModulePropsV2,
  SchemaUtilsV2,
} from "@dendronhq/common-all";
import { assign, parse, stringify } from "comment-json";
import fs from "fs-extra";
import matter from "gray-matter";
import YAML from "js-yaml";
import path from "path";
import { SchemaParserV2 } from "./parser";

export function file2Schema(fpath: string): SchemaModulePropsV2 {
  const root = path.dirname(fpath);
  const fname = path.basename(fpath, ".schema.yml");
  const schemaOpts = YAML.safeLoad(
    fs.readFileSync(fpath, { encoding: "utf8" }),
    {
      schema: YAML.JSON_SCHEMA,
    }
  ) as SchemaModuleOptsV2;
  return SchemaParserV2.parseRaw(schemaOpts, { root, fname });
}
export function string2Schema({
  vault,
  content,
  fname,
}: {
  vault: DVault;
  content: string;
  fname: string;
}) {
  const schemaOpts = YAML.safeLoad(content, {
    schema: YAML.JSON_SCHEMA,
  }) as SchemaModuleOptsV2;
  return SchemaParserV2.parseRaw(schemaOpts, { root: vault.fsPath, fname });
}

export function string2Note({
  content,
  fname,
}: {
  content: string;
  fname: string;
}) {
  const options: any = {
    engines: {
      yaml: {
        parse: (s: string) => YAML.safeLoad(s, { schema: YAML.JSON_SCHEMA }),
        stringify: (s: string) =>
          YAML.safeDump(s, { schema: YAML.JSON_SCHEMA }),
      },
    },
  };
  const { data, content: body } = matter(content, options);
  const custom = DNodeUtilsV2.getCustomProps(data);
  const note = DNodeUtilsV2.create({
    ...data,
    custom,
    fname,
    body,
    type: "note",
  });
  return note;
}

export function file2Note(fpath: string): NotePropsV2 {
  const content = fs.readFileSync(fpath, { encoding: "utf8" });
  const { name: fname } = path.parse(fpath);
  return string2Note({ content, fname });
}

export function note2File(
  note: NotePropsV2,
  vaultPath: string,
  opts?: { writeHierarchy?: boolean }
) {
  const { fname } = note;
  const ext = ".md";
  const payload = NoteUtilsV2.serialize(note, opts);
  return fs.writeFile(path.join(vaultPath, fname + ext), payload);
}

export function schemaModuleOpts2File(
  schemaFile: SchemaModuleOptsV2,
  vaultPath: string,
  fname: string
) {
  const ext = ".schema.yml";
  return fs.writeFile(
    path.join(vaultPath, fname + ext),
    SchemaUtilsV2.serializeModuleOpts(schemaFile)
  );
}

export function schemaModuleProps2File(
  schemaMProps: SchemaModulePropsV2,
  vaultPath: string,
  fname: string
) {
  const ext = ".schema.yml";
  return fs.writeFile(
    path.join(vaultPath, fname + ext),
    SchemaUtilsV2.serializeModuleProps(schemaMProps)
  );
}

export function assignJSONWithComment(obj: any, data: any) {
  return assign(
    {
      ...data,
    },
    obj
  );
}

export function readJSONWithComments(fpath: string) {
  const obj = parse(fs.readFileSync(fpath).toString());
  return obj;
}

export function writeJSONWithComments(fpath: string, data: any) {
  const payload = stringify(data, null, 4);
  return fs.writeFile(fpath, payload);
}
