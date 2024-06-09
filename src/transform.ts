import { CallExpression, Project, SourceFile, SyntaxKind } from "ts-morph"


type TransformFunction = (sourceFile: SourceFile, alias: Set<string>) => string[];

export const moduleName = "type-transform-utils"
const typeKeysFunctionName = "typeKeys"

export function transformCode(filePath: string, code: string = ""): { code: string, depFiles: string[] } {
  const project = new Project({})
  let sourceFile;
  if (code == "") {
    sourceFile = project.addSourceFileAtPath(filePath);
  } else {
    sourceFile = project.createSourceFile(filePath, code, { overwrite: true });
  }

  const importDeclarations = sourceFile.getImportDeclarations().filter(i => i.getModuleSpecifierValue() === moduleName)

  const aliasMap: Map<string, Set<string>> = importDeclarations
    .map(i => i.getNamedImports())
    .flat()
    .reduce((map, cur) => {
      const name = cur.getName()
      const alias = cur.getAliasNode()?.getText() ?? name;
      if (!map.has(name)) {
        map.set(name, new Set())
      }
      map.get(name)!.add(alias)
      return map
    }, new Map<string, Set<string>>())

  const depFiles = new Set<string>()

  Object.keys(functionTransform).filter(key => aliasMap.has(key)).forEach(key => {
    const deps = (functionTransform as Record<string, TransformFunction>)[key](sourceFile, aliasMap.get(key)!)
    deps.forEach(dep => depFiles.add(dep))
  })


  return {
    code: sourceFile.getText(),
    depFiles: [...depFiles]
  }
}

const functionTransform = {
  [`${typeKeysFunctionName}`]: (sourceFile: SourceFile, alias: Set<string>): string[] => {
    const typeKeysFunctionNameMatch = new RegExp(`^(${[...alias].join("|")})`)
    const depFiles: string[] = []
    const typeKeyCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).filter(c => typeKeysFunctionNameMatch.test(c.getText()))
    for (const call of typeKeyCalls) {
      const { keys, depFile } = getGenericKeys(call)
      call.replaceWithText(JSON.stringify(keys));
      if (depFile) {
        depFiles.push(depFile)
      }
    }
    return depFiles
  }
} as const;

function getGenericKeys(c: CallExpression): { keys: string[], depFile?: string } {
  const typeLiterals = c.getDescendantsOfKind(SyntaxKind.TypeLiteral)
  const typeReferences = c.getDescendantsOfKind(SyntaxKind.TypeReference)
  if (typeLiterals.length) {
    return {
      keys: typeLiterals[0].getProperties().map(p => p.getName())
    }
  } else if (typeReferences.length) {
    const interfaceDeclaration = typeReferences[0].getType()
    const ownKeys = interfaceDeclaration.getProperties().map(p => p.getName())
    const superkeys = interfaceDeclaration.getBaseTypes().map(s => s.getProperties()).flat().map(s => s.getName())
    let depFile: string | undefined = undefined
    const text = interfaceDeclaration.getText();
    if (text.includes("import")) {
      depFile = text.slice(text.indexOf("import(\"") + 8, text.indexOf("\")"))
    }
    return {
      keys: [...ownKeys, ...superkeys],
      depFile
    }
  } else {
    return {
      keys: []
    }
  }
}