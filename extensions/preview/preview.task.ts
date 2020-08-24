import { join } from 'path';
import { BuildTask, BuildContext, BuildResults } from '@teambit/builder';
import { Bundler, BundlerContext, Target, BundlerMain } from '@teambit/bundler';
import { ComponentMap } from '@teambit/component';
import { Capsule } from '@teambit/isolator';
import { AbstractVinyl } from 'bit-bin/dist/consumer/component/sources';
import { Compiler } from '@teambit/compiler';
import { PreviewDefinition } from './preview-definition';
import { PreviewMain } from './preview.main.runtime';

export class PreviewTask implements BuildTask {
  constructor(
    /**
     * bundler extension.
     */
    private bundler: BundlerMain,

    /**
     * preview extension.
     */
    private preview: PreviewMain
  ) {}

  extensionId = 'teambit.bit/preview';

  async execute(context: BuildContext): Promise<BuildResults> {
    const defs = this.preview.getDefs();
    const capsules = context.capsuleGraph.capsules;
    const url = `/preview/${context.envRuntime.id}`;

    const targets: Target[] = await Promise.all(
      capsules.map(async ({ capsule }) => {
        return {
          entries: await this.makeEntries(capsule, defs, context),
          capsule,
        };
      })
    );

    const bundlerContext: BundlerContext = Object.assign(context, {
      targets,
      entry: [],
      publicPath: this.getPreviewDirectory(),
      rootPath: url,
    });

    const bundler: Bundler = await context.env.getBundler(bundlerContext);
    const componentResults = await bundler.run();

    return {
      components: componentResults,
      // TODO: @guy rename to `preview` instead of `public`.
      artifacts: [{ dirName: this.getPreviewDirectory() }],
    };
  }

  getPreviewDirectory() {
    // TODO: @guy please make sure to wire it to a config as above.
    return 'public';
  }

  private async makeEntries(capsule: Capsule, defs: PreviewDefinition[], context: BuildContext): Promise<string[]> {
    const previewLinks = await Promise.all(
      defs.map(async (previewDef) => {
        const moduleMap = await previewDef.getModuleMap([capsule.component]);
        const modulePaths = this.getPathsFromMap(capsule, moduleMap, context);

        return {
          name: previewDef.prefix,
          modulePaths,
          templatePath: await previewDef.renderTemplatePath?.(context),
        };
      })
    );

    // if needed, could write to the capsule's /dist dir
    // i.e. join(capsule.path, 'dist', `__${random()}`);
    const entryPath = await this.preview.writeLinks(previewLinks);

    const previewMain = await this.preview.writePreviewRuntime();
    return [require.resolve(previewMain), entryPath];
  }

  private getPathsFromMap(
    capsule: Capsule,
    moduleMap: ComponentMap<AbstractVinyl[]>,
    context: BuildContext
  ): ComponentMap<string[]> {
    const compiler: Compiler = context.env.getCompiler(context);
    return moduleMap.map((files) => {
      return files.map((file) => join(capsule.path, compiler.getDistPathBySrcPath(file.relative)));
    });
  }
}