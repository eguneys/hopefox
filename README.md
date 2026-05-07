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

A definition has the following form:

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

#### B. Descriptions



#### C. Extensions

##### C0. Double Variable Case for Captures
##### C1. Injective Variable Unification
##### C2. Rejective Variable Unification
##### C3. Tagging Over Descriptive Lines