Let's get back to engine details. Earlier when we established commit mechanics, we had Relation interface like this:

```
interface Relation<T extends Row> {
    id: RelationId
    schema: string[]
    rows: T[]
    indexByWorld: Map<WorldId, T[]>
}
```



and we had a function to make relations like this:


```
function makeRelation<T extends Row>(id: RelationId, schema: string[]): Relation<T> {
    return {
        id,
        schema,
        rows: [],
        indexByWorld: new Map()
    }
}
```

and resolvers had this interface:


```
interface Resolver {
    id: ResolverId

    inputRelations: RelationId[]

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null
}

type ResolverOutput = {
    [relation: RelationId]: Row[]
}

```

the engine holds the subscriptions for resolvers to the input relations and push downStream committed changes to resolvers on commit.



At a later discussion, when we mapped EngineGraph to the Engine runtime, we had code similar to this:

```
    constructor(graph: EngineGraph) {
        for (const [relId, metaRel] of graph.relations) {
            this.relations.set(relId, new RelationNodeRuntime(relId, metaRel.schema))
        }


        for (const node of graph.nodes.values()) {
            if (node.kind === 'resolver') {
                //const input = this.relations.get(node.input)!
                //const outputs = node.outputs.map(id => this.relations.get(id)!)

                /*
                const resolver = new ResolverNodeRuntime(
                    node.id, [node.input], (r) => r.rows)
                this.resolvers.push(resolver)
                */
            } else if (node.kind === 'join') {
                //const inputs = node.inputs.map(id => this.relations.get(id)!)
                const output = this.relations.get(node.output)!
                const join = new JoinNodeRuntime(node.id, node.inputs, (binding) => true)
            }
        }
    }
```


As you can see this is half commented out because the links are slightly different because the ResolverNodeRuntime and RelationNodeRuntime you mentioned we had earlier was slightly different from the one I also posted above. I prefer to keep the initial draft with commit mechanics working. But I still have to map the EngineGraph to EngineRuntime correctly. and RelationNodeRuntime