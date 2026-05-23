I am trying to understand how the resolvers works conceptually take a look at this:

```
type ResolverOutput = {
    [relation: RelationId]: Row[]
}

interface Resolver {
    id: ResolverId

    inputRelations: RelationId[]

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null
}

```


So a resolver have inputRelations defined, where it can get notified by changing Relations. Each time one of the relations in inputRelations get changed input: InputSlice<Row> on resolve parameter, gets populated by that relations rows, so InputSlice<Row> doesn't refer to one kind of specific Row type but it could be any Row type contained in inputRelations.

As for outputs, resolve returns a ResolverOutput, that can publish to any kind of relation. Note that outputs: RelationId[] is not specified in Resolver as a design choice, because it might be unnecessary but tell me if it's required.

So conceptually resolve method, is called with different relations contained in inputRelations subscriptions, and can return different outputs pushing to different relations, depending on what the input is and which relations input is coming from.