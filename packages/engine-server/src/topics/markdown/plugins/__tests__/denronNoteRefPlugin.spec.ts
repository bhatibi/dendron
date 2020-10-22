import { DendronError, DEngineClientV2 } from "@dendronhq/common-all";
import { createLogger, EngineTestUtils } from "@dendronhq/common-server";
import { NodeTestUtilsV2 } from "@dendronhq/common-test-utils";
import _ from "lodash";
import { FileStorageV2 } from "../../../../drivers/file/storev2";
import { DendronEngineV2 } from "../../../../enginev2";
import { ParserUtilsV2 } from "../../utilsv2";
import {
  dendronNoteRefPlugin,
  DendronNoteRefPluginOpts,
} from "../dendronNoteRefPlugin";

function getProcessor(opts: DendronNoteRefPluginOpts) {
  return ParserUtilsV2.getRemark().use(dendronNoteRefPlugin, opts);
}
let LOGGER = createLogger("engine-server.test.log");

describe("basic", () => {
  describe("parse", () => {
    const opts = {
      renderWithOutline: true,
      replaceRefOpts: {
        forNoteRefInSite: true,
      },
      engine: {} as any,
    } as DendronNoteRefPluginOpts;

    test("init", () => {
      const resp = getProcessor(opts).parse(`((ref:[[foo.md]]))`);
      expect(resp).toMatchSnapshot();
      // child1 paragraph, child2 link
      // @ts-ignore
      expect(resp.children[0].children[0].data.link).toEqual({
        type: "file",
        name: "foo",
        anchorStart: undefined,
        anchorEnd: undefined,
      });
    });

    test("without suffix", () => {
      const resp = getProcessor(opts).parse(`((ref:[[foo]]))`);
      expect(resp).toMatchSnapshot();
      // child1 paragraph, child2 link
      // @ts-ignore
      expect(resp.children[0].children[0].data.link).toEqual({
        type: "file",
        name: "foo",
        anchorStart: undefined,
        anchorEnd: undefined,
      });
    });

    test("with start anchor", () => {
      const resp = getProcessor(opts).parse(`((ref:[[foo]]#h1))`);
      expect(resp).toMatchSnapshot();
      // child1 paragraph, child2 link
      // @ts-ignore
      expect(resp.children[0].children[0].data.link).toEqual({
        type: "file",
        name: "foo",
        anchorStart: "h1",
        anchorEnd: undefined,
      });
    });

    test("with start and end", () => {
      const resp = getProcessor(opts).parse(`((ref:[[foo]]#h1:#h2))`);
      expect(resp).toMatchSnapshot();
      // child1 paragraph, child2 link
      // @ts-ignore
      expect(resp.children[0].children[0].data.link).toEqual({
        type: "file",
        name: "foo",
        anchorStart: "h1",
        anchorEnd: "h2",
      });
    });

    test("doesn't parse inline code block", () => {
      const resp = getProcessor(opts).parse("`((ref:[[foo.md]]))`");
      expect(resp).toMatchSnapshot("bond");
      // @ts-ignore
      expect(resp.children[0].children[0].type).toEqual("inlineCode");
    });
    test.skip("doesn't parse code block", () => {});
  });

  describe("stingify", () => {
    let root: string;
    let opts: DendronNoteRefPluginOpts;
    let engine: DEngineClientV2;
    let vaultDir: string;

    beforeEach(async () => {
      root = await EngineTestUtils.setupVault({
        initDirCb: async (_vaultDir: string) => {
          vaultDir = _vaultDir;
          await NodeTestUtilsV2.createNote({
            vaultDir,
            noteProps: {
              fname: "daily.tasks",
              body: ["", `# Tasks`, "task1", "task2"].join("\n"),
            },
          });
        },
      });
      engine = new DendronEngineV2({
        vaults: [root],
        forceNew: true,
        store: new FileStorageV2({ vaults: [root], logger: LOGGER }),
        mode: "fuzzy",
        logger: LOGGER,
      });

      opts = {
        renderWithOutline: false,
        replaceRefOpts: {},
        engine,
      } as DendronNoteRefPluginOpts;
    });

    test("basic", async () => {
      await engine.init();
      const out = getProcessor(opts)
        .processSync(`((ref:[[daily.tasks]]))`)
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("task1") >= 0).toBeTruthy();
    });

    test("basic block", async () => {
      await engine.init();
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("task1") >= 0).toBeTruthy();
    });

    test("basic block with fm", async () => {
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: ["---", "id: foo", "---", `# Tasks`, "task1", "task2"].join(
            "\n"
          ),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("task1") >= 0).toBeTruthy();
      expect(out.indexOf("---") >= 0).toBeFalsy();
    });

    test("basic block with header and start ", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#Header2))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("task1") >= 0).toBeFalsy();
      expect(out.indexOf("task2") >= 0).toBeTruthy();
    });

    test("basic block with header and start, start invalid ", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#badheader))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("Note Ref Error") >= 0).toBeTruthy();
      expect(out.indexOf("badheader not found") >= 0).toBeTruthy();
    });

    test("basic block with header, start and end, end invalid ", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
        "<div class='bar'>",
        "BOND",
        "</div>",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#Header1:#badheader))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("Note Ref Error") >= 0).toBeTruthy();
      expect(out.indexOf("badheader not found") >= 0).toBeTruthy();
    });

    test("basic block with header and start, offset ", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#Header2,1))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("Header2") >= 0).toBeFalsy();
      expect(out.indexOf("task1") >= 0).toBeFalsy();
      expect(out.indexOf("task2") >= 0).toBeTruthy();
    });

    test("basic block with header, start and end ", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
        "<div class='bar'>",
        "BOND",
        "</div>",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#Header1:#Header2))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("Header1") >= 0).toBeTruthy();
      expect(out.indexOf("task1") >= 0).toBeTruthy();
      expect(out.indexOf("task2") >= 0).toBeFalsy();
    });

    test("basic block with header, start and end, offset ", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
        "<div class='bar'>",
        "BOND",
        "</div>",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#Header1,1:#Header2))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("Header1") >= 0).toBeFalsy();
      expect(out.indexOf("task1") >= 0).toBeTruthy();
      expect(out.indexOf("task2") >= 0).toBeFalsy();
    });

    test("basic block with wildcard as 1st elem ", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
        "<div class='bar'>",
        "BOND",
        "</div>",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#*,1:#header2))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("Header1") >= 0).toBeTruthy();
      expect(out.indexOf("task1") >= 0).toBeTruthy();
      expect(out.indexOf("task2") >= 0).toBeFalsy();
    });

    test("basic block with wildcard as 2nd elem ", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
        "<div class='bar'>",
        "BOND",
        "</div>",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#Header1,1:#*))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("Header1") >= 0).toBeFalsy();
      expect(out.indexOf("task1") >= 0).toBeTruthy();
      expect(out.indexOf("task2") >= 0).toBeFalsy();
    });

    test("2 lvl recursion", async () => {
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "foo.one",
          body: ["# Foo.One", `((ref: [[foo.two]]))`].join("\n"),
        },
      });
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "foo.two",
          body: ["# Foo.Two", `blah`].join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(["# Foo", "((ref: [[foo.one]]))"].join("\n"))
        .toString();
      expect(out).toMatchSnapshot();
      _.every(["# Foo", "# Foo.One", "# Foo.Two"], (ent) => {
        expect(out.indexOf(ent) >= 0).toBeTruthy();
      });
    });

    test("3 levels of recursion", async () => {
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "foo.one",
          body: ["# Foo.One", `((ref: [[foo.two]]))`].join("\n"),
        },
      });
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "foo.two",
          body: ["# Foo.Two", `((ref: [[foo.three]]))`].join("\n"),
        },
      });
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "foo.three",
          body: ["# Foo.Three", `Three`].join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(["# Foo", "((ref: [[foo.one]]))"].join("\n"))
        .toString();
      expect(out).toMatchSnapshot();
      _.every(
        [
          "# Foo",
          "# Foo.One",
          "# Foo.Two",
          "ERROR: Too many nested note references",
        ],
        (ent) => {
          expect(out.indexOf(ent) >= 0).toBeTruthy();
        }
      );
    });

    test("ref with ref, inf recursion", async () => {
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "foo.one",
          body: ["# Foo.One", `((ref: [[foo.two]]))`].join("\n"),
        },
      });
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "foo.two",
          body: ["# Foo.Two", `((ref: [[foo.one]]))`].join("\n"),
        },
      });
      const out = getProcessor(opts)
        .processSync(["# Foo", "((ref: [[foo.one]]))"].join("\n"))
        .toString();
      expect(out).toMatchSnapshot();
      _.every(
        [
          "# Foo",
          "# Foo.One",
          "# Foo.Two",
          "ERROR: Too many nested note references",
        ],
        (ent) => {
          expect(out.indexOf(ent) >= 0).toBeTruthy();
        }
      );
    });

    test("renderWithOutline", async () => {
      const txt = [
        "---",
        "id: foo",
        "---",
        `# Tasks`,
        "## Header1",
        "task1",
        "## Header2",
        "task2",
        "<div class='bar'>",
        "BOND",
        "</div>",
      ];
      await NodeTestUtilsV2.createNote({
        vaultDir,
        noteProps: {
          fname: "daily.tasks",
          body: txt.join("\n"),
        },
      });
      const out = getProcessor({ ...opts, renderWithOutline: true })
        .processSync(
          `# Foo Bar
((ref:[[daily.tasks]]#Header1:#Header2))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      expect(out.indexOf("Header1") >= 0).toBeTruthy();
      expect(out.indexOf("task1") >= 0).toBeTruthy();
      expect(out.indexOf("task2") >= 0).toBeFalsy();
    });

    test("missing ref", async () => {
      const proc = getProcessor({ ...opts, renderWithOutline: true });
      const out = proc
        .processSync(
          `# Foo Bar
((ref:[[missing]]#Header1:#Header2))`
        )
        .toString();
      expect(out).toMatchSnapshot();
      const errors = proc.data("errors") as DendronError[];
      expect(errors).toMatchSnapshot();
      expect(errors[0].msg).toEqual("missing not found");
      expect(out.indexOf("missing not found") >= 0).toBeTruthy();
    });
  });
});
