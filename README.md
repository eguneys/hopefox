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

Variables in the description block can have the following form:

`if captures_hanging(queen4, queen3_queen5)`

Note the `queen3_queen5` variable, this is 2 variables bound by an underscore. This is similar to writing them as separate variables but expressed in this form to imply the meaning, `queen3` and `queen5` are the same square, but especially for captures `queen3` is the queen being captured, `queen5` is the other queen that is capturing `queen3` and landing on the same square called differently as `queen5`. In other words: `queen4` captures `queen3` and now called `queen5`.

Of course this also implies `captures_hanging` definition is being called with this extended variable syntax, which **Must** be reflected in the definition itself. Like this:

```
def captures_hanging(From, Captured_To)
  no_defense(Captured)
  capture(From, To, Captured)
```

Note the `Captured_To` similar variable syntax symmetric to how it's being called. At this point, `Captured` and `To` are being replaced as usual if they were separate variables. But please note that, the builtin keywords cannot be called with this extended form, and **Must Always** be passed a normal variable without any underscore or any other extension.

##### C1. Injective Variable Unification

The following demonstrates how Injective Variable Unification is specified:

```
  if evades_attack_non_confrontational(queen, queen2, rook3) 
    if check_king_with_block_no_capture_no_evade(rook3, rook5, king)
      if blocks(knight, $knight2, rook5, king)
        if checkmate(rook5, rook6, king)
  if evades_with_cover_block(queen, queen3, rook3, $knight2)
    if captures_hanging(queen4, queen3_queen5) then
```

Note the $knight2 variable which has the `$` prefix followed by a normal variable. This variable is called an **Injective Variable**. And it has the following property:

The pairs of **Injective Variable** unificates across branches. In other words, the first unification of the first use of the first **Injective Variable** unifies—constraints the second **Injective Variable** that has been used in the other sibling.

This also means, **in normal variables**, the reuse of **same variable names in sibling children are not related and they don't refer to the same variable, even though when they are named the same**.

An **Injective Variable** **May** be used in a descriptive block **anywhere** on 2 sibling descriptions and/or on their children. Only one pair of **Injective Variable**s **May** be used on any given 2 siblings.

Also note that `$` prefix can also be used in conjunction with Double Variable Case.

Also note that both **Injective Variables** when used as a pair, must have the same variable names, and they must not differ.

##### C2. Rejective Variable Unification

Similar to Injective Variables, **Rejective Variables** on the other hand, has the `!` suffix on a normal variable, and they **May** be used on 2 or more different sibling children. And There **May only** be 1 set of **Rejective Variables** on any given 2 sibling children.

When **Rejective Variables** are used they **Must only** be on the immediate sibling children and not inside the children of the siblings. For example this is allowed:

```
  if hangs_to(queen2, queen3!_knight3, knight)
  if checks(queen2, queen3!, king2)
```

The later **Rejective Variable** when used, discards the earlier unifications of it's earlier uses, thus rejecting the already handled cases, allowing precise expression cases.

Also similar to Injective Variables **Rejective Variables**, must have the same variable names, and they must not differ.

##### C3. Tagging Over Descriptive Lines

A **Descriptive line** may contain additional tags like this:

`if sacrifices_with_exchange(queen3, rook3_queen4, bishop, bishop2) [win]`

`[win]` is one tag, but there may be multiple tags inside square brackets separated by commas.

Tags contain meta-data about the descriptive lines. So far there are 2 use cases for tags as specified here:

`win` tag: **Must** be used on a single **leaf** child in a complete **Descriptive block** and it indicates the solution line is matched only when that specific child outputs a single line. Essentially this tag indicates the idea of a winning line.

`cond` tag: **Can** be used on any **leaf** children any number of times on a complete **Descriptive block** and it indicates a condition such as the accompanying line it is used on **Must** output a single line in order for a solution to be matched. Essentially providing a hard-case condition on the existence of a certain line in order for the full solution to be matched.

#### D. Structure of the .gof Script file

When .gof Script files are being run on a database of puzzles, this section is related to how that specific use-case is handled.

A .gof Script file has the following form:

```
puzzle numbers separated by spaces
===
Descriptive Blocks
###
...Any More Descriptive Blocks followed by ###
###
Definition Blocks
```

In other words the lines of the file is split with `###` and the last block that comes after the `###` is where the definition blocks live.

**Only** the **Last section of descriptive blocks** are being run. Earlier sections that are separated by the `###` are ignored. 
This allows moving parts of the blocks you want to single out or test in case by case basis, for faster iteration.

The Header that comes before `===` consists of puzzle numbers, you want to skip matching against.

The following form may be used as a comment line:

```'Comment line'```

A **Descriptive Block** is any top level `if` description along with it's children.

#### E. Output Shape

An visual output for a **Descriptive Block** may have the following form:

```
0 https://lichess.org/training/00008
Solution: Rxe7 Qb1+ Nc1 Qxc1+ Qxc1
if has_eye_king { Rxe7 }
ve attacks { Rxe7 }
 if no_cover { Rxe7 Rb8 }..
  if checkmate_with_capture { Rxe7 Rb8 Qxh7# }..
 if hangs_to { Rxe7 Qa1+ Nxa1 }..
 if checks { Rxe7 Qb1+ }
  if blocks_check_defended_by { Rxe7 Qb1+ Nc1 }
   if sacrifices_with_exchange { Rxe7 Qb1+ Nc1 Qxc1+ Qxc1 }
```

This is the same structure as your input descriptive block, variables are replaced by actual matching lines.

Matching lines has the following form: `{ Rxe7 Qa1+ Nxa1 }..`. So line is within curly braces and optional `..` or `...` is present at the end. This dots designate if there were multiple matches not listed here. ***No dots*** means a **single match** was found.

Also additional information on the overall run is put in the beginning and end of the file that has the following form:

```
Time: 0.7ms per puzzle took 75s
Coverage: %2 Accuracy: %0
Tp/Fp: 0/1703 N: 98297 Total: 100000
```

`Tp` is True Positive, meaning the actual solution is found in the `win` tag with `cond` tags also being present as found matches.

`Fp` is False Positive, meaning some partial matching has been happened but not a full match of the solution line has been happened.

`N` is Negative, meaning not a single match has been found for the descriptive block.

This header with additional information gives you the statistics of the amount of number of specific coverage results that has been categorized.

The rest of the output is example listings of coverage categories along with their visual output for some of them.

#### F. Avenues of Potential Extensions for the Future

* Variables can also refer to square names not necessarily only the piece roles.
* Addition of more tags to control the visual verbosity of the output.
* More builtin Keywords

#### Addendum. Non Exhaustive List of Builtin Keywords

_This list non-exhaustive, and there are undocumented keywords not listed here, such as promotion or pawn pushes_.

##### A. Actions

* **move**(From, To) : A move is made From to To
* **capture**(From, To, Captured) : A capture is made From to To and Captured is the piece being captured

##### B. Filters

* **attack**(To, King): To attacks King
* **attack_through**(To, AttackThrough, AttackTo) : To attacks AttackTo blocked by AttackThrough
* **no_defense**(Hanging) : Hanging piece has no defense by the same color pieces
* **no_attack**(AttackFrom, To) : AttackFrom is not attacking To
* **opposite**(To, AttackTo) : To and AttackTo has pieces with different colors

* **defend**(DefendFrom, To) : DefendFrom defends To

* **backrank_wall**(King, A, B, C) : King is on the backrank and A, B, C are the pawns covering the escape squares on the frontier
* **no_king_evades**(King) : King has no safe evasion moves, (not necessarily in check)
* **no_captures**(To) : To cannot be captured
* **no_blocks_check**(To, King) : To attacks King that cannot be blocked any piece
* **no_push_blocks_check**(To, King) : To attacks King that cannot be blocked by a pawn push