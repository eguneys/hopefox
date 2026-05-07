## eguneys/hopefox is an Implementation of the GofChess Tactics Language

Over the years, we've built ten's of iterations of the language, until we have arrived at a decent practical version which we Release as v1.0.0 and the un-official specification is given later in the document.

GofChess Tactics Language is a Prolog-like language specialized for chess logic. It has highly flexible features that allows one to clearly describe chess tactics aimed at human understanding and an engine matching against the corresponding moves on any given position.

This repository is the engine that implements the language written in Typescript. The clarity and flexibility of fast iteration of prototyping is prioritized over performance since the language has a lot of moving parts and always subject to change. 

### Testing the Language in Practice

There is a test run that basically acts as a live-reloading script for using the language. It reads the GofChess program from .gof script file and runs it against the puzzle database and writes the statistics output into the output file. It watches for changes in the files and re-runs the test on every change, so you can iterate on a tight live loop.

#### Pre-requisites

* [Node.js](https://nodejs.org/en) must be installed first to run this repository.
* A package manager like [pnpm](https://pnpm.io/) is recommended to install the dependencies and run the tests.

#### Running the Language

* Run `pnpm install` to install the dependencies first.
* Run `pnpm test` to start the live-reloading tight loop that runs the language. 

Here are the specifics:

`pnpm test` runs the test file [test/gof4.test.ts](test/gof4.test.ts) which is basically a single test that acts as a live-reload runner for the language.

`gof4.test.ts` reads the .gof language script from the file [test/fourth.gof](test/fourth.gof), runs it against the puzzle database _about over 10000 puzzles_ and writes to the output file [test/_output4.txt](test/_output4.txt). Every change you make whether to the codebase or to the script files are live-reloaded automatically to reflect the changes.

We recommend after running `pnpm test` open `test/fourth.gof` on one panel, and `test/_output4.txt` on another panel, and experiment with the language reflecting the changes immediately.

Please be beware of obscure bugs or ugly error messages you may encounter, use the language at your own discretion.

The following is the un-official specification of the language released at v1.0.0.

### Un-Official GofChess Language Specification v1.0.0

#### A. Definitions

A **definition** has the following form:

```
def definition_name(VariableA, VariableB)
  builtin_keyword1(VariableA)
  builtin_keyword2(VariableA, VariableB)
```

`definition_name` can be **any descriptive name** you may label the definition as.
`VariableA` and `VariableB` are variables. Definition Variables **Must** start with an Uppercase letter.

What follows is a list of builtin keywords written one on each separate line.

`builtin_keyword1` and `builtin_keyword2` are builtin keywords, that executes some chess logic over the variables passed to them, basically unifying—constraining them.

There are 2 types of builtin keywords. **a.** Action keywords, **b.** Filter keywords. **Action keywords** make a single move on the board, like a move or a capture. Any subsequent keywords coming after that will act on the mutated board. **Filter keywords** are purely unifies—constraints it's variables passed to it, making no changes to the board state. Action keywords on the other hand do mutate the board, along with also unifying—constraining the variables meanwhile.

A list of all builtin_keywords are non-exhaustive and will be given [later in this document](#addendum-non-exhaustive-list-of-builtin-keywords).

#### B. Descriptions

A description block has the following form:

```
if a_definition(queen, pawn, king)
ve b_definition(rook, rook2, pawn)
  if c_definition(rook3, rook4, pawn)
    if checkmate_with_capture(queen, pawn_queen2, king)
  if checks(queen2, queen3!, king2)
    if blocks_check_defended_by(knight, knight2, queen, queen3, king2)
```

It has a nested structure of description blocks starting with `if` or `ve` syntax, followed by a definition name, which **Must** be defined as a **definition** in the same script file, followed by variables passed to the definition.

The variables passed to the definitions in the description block has to be _lowercase_ and **Must** start with a piece role like `king bishop rook king queen pawn` followed by an optional numeric identifier like `1 2 3 10 11` etc.

There are some extensions to the syntax of how variables are written, which will be specified later in the document.

A description line of the form: `if a_definition(queen, pawn, king)` is expanded into the accompanying definition `a_definition` and the variables of the definition are replaced by the variables passed to `a_definition` in this description line.

For example, if we have these 2 forms written:


`if a_definition(queen, queen2, king)`

and

```
def a_definition(From, To, King)
  move(From, To)
  attack(To, King)
```

The definition is replaced by it's atomic blocks like this and is equivalent to basically saying something like this:

```
  move(queen, queen2)
  attack(queen2, king)
```

This in turn is executed logically as a way of saying in natural language like this:

```
A Queen on a square called queen moves to a square called queen2.
Queen on the square queen2 attacks a King on the square called king. 
That's how the queen checks the king.
```

A description line of the form: `ve b_definition(queen, pawn, king)` is equivalent to how `if` works except it **Must** come after an `if` block and semantically equivalent to continuing the execution with a separate *definition* without an interruption. As if the `ve` clause is a bind of two definitions attached one after the other.

This distinction is made against how nested `if` structures form a tree structure that expresses the move variations in chess.

For example this nested tree structure of the following form entails:

```
if a_definition(rook, rook2)
  if c_definition(rook3, rook4, pawn)
    if c1_definition(queen, pawn_queen2, king)
  if d_definition(queen2, queen3!, king2)
    if d1_definition(knight, knight2, queen, queen3, king2)
```

`a_definition` is run, followed by entering into `c_definition` which is run, but the state after `a_definition` is preserved somewhere to be restored for the execution of the other child `d_definition`. So after `c1_definition` is run, the matches are logged, but the position state is restored to state after the `a_definition` has been run, and followed by the `d_definition` and `d1_definition` follows after that.

#### C. Extensions

##### C0. Double Variable Case for Captures
##### C1. Injective Variable Unification
##### C2. Rejective Variable Unification
##### C3. Tagging Over Descriptive Lines

#### D. Structure of the .gof Script file

#### E. Output Shape

#### F. Avenues of Potential Extensions for the Future

#### Addendum. Non Exhaustive List of Builtin Keywords

##### A. Actions

##### B. Filters

