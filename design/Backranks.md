## How many different BackRank Mates are there?

If you have read the first chapter of the book [Bobby Fischer Teaches Chess](https://en.wikipedia.org/wiki/Bobby_Fischer_Teaches_Chess), you are familiar with the title. Bobby Fischer discusses different special cases of how a Backrank Mate can be present in real games. In this post we are going to start with the very basics and delve deeper into those different special cases. So that once we think about it, we can appreciate how the most basic checkmate can get so involved.

We will talk with lists and numbers, by essentially data mining the Lichess Puzzle Database with over 4 million puzzles with the help of Gof Chess Language which I developed and published a blog post about it which you can read [here](https://lichess.org/@/heroku/blog/gofchess--a-technical-dive-into-formalization-of-chess-tactics/KULHdYDn).

Be fore-warned that some errors or inaccurate information may be present in this article, while we rely on Gof Chess which is in a very early stage, so **Please Make Sure to Leave your Feedback ** which is very important to us.

As the nature of this post, while covering the numbers, we will skip some branching alternative numbers for the sake of the narrative, but they will also be covered as special cases in the end.

Finally the full lists and numbers will be available as a spreadsheet and separate links at the end of this post. And some sample of the examples for each case will be provided as a separate Lichess study dedicated to it.

## A. Anatomy of BackRank Mate in Ones

We can look for a backrank mate if the king is in a backrank wall. A backrank wall is where king is on the backrank, and the 3 forward squares the king can go to are occupied by king's own pawns.

Next, our rook can check the king on the backrank.

_Please note what we are **not** considering in the usual sense. King is only blocked by it's own pawns, not any other type of piece like a bishop or a knight. And we are not checking the king with a queen on the backrank but only with a rook_.

At this point, we have to see what the opponent can do. The definition of a checkmate tells us, that king has no escape squares, the king is in check, and the check cannot be blocked.

The check on the backrank with the rook while the king is in a backrank wall already tells us that king cannot evade this check. So there are 2 cases we have to consider, and a little bit more.

If opponent cannot capture our rook, and cannot block the check, it's a checkmate, that's a mate in 1. Because note that king cannot evade the check by our definitions.

For this first part, The script is ran over the 4 million puzzles with a property that the backrank wall consists of any friendly pieces, and not just pawns. And one additional property that our rook was giving a check. It matched on total of 71.622 puzzles.

On a second run, I ran the script over those matched, with the property that the backrank wall consists of only pawns, so 3 pawns in front of the king with the same color (instead of just any friendly piece). And 21.816 puzzles were filtered out, that is they included some other piece other than only pawns. So we are left with a total of 49.806 puzzles that we are interested in.

From now on we will keep filtering out those puzzles while discussing the filtered cases, until we have covered them all.

5674 puzzles are Mate in 1 with a simple backrank checkmate which we described above.

So that leaves us with 44.124 puzzles left to talk about.

## B. Opponent can block the check

20.098 puzzles involves our rook checking the king in the backrank, and opponent while cannot capture our rook, however can block the check with a rook, so it's not immediate checkmate.

_Note that we are still left with 24.026 puzzles we haven't discussed yet. We will come to that later_

19.741 puzzles involves their blocking rook is hanging, that is it doesn't have any defender so we can just capture it.

_That leaves 357 puzzles involving their blocking rook is not hanging which again we will get to later_

Our journey continues, with 17.268 puzzles capturing the blocking rook. To recap, we check the king in the backrank, their rook blocks and hanging, and we capture the hanging rook.

_2473 puzzles are remaining as another special case here_

17.226 puzzles ends with a checkmate after we capture the hanging rook. That's basically a Mate in 2. Checking the backrank and their rook is blocking desperado after we deliver checkmate by capturing it.

41 puzzles continues after we capture the hanging rook. 

_And the remaining 1 puzzle is another special case._

Out of those 41 puzzles, 33 of them ends without delivering a checkmate but after we capture the hanging rook, their bishop blocks the check.s, 33 of them ends without delivering a checkmate but after we capture the hanging rook, their bishop blocks the check.s, 33 of them ends without delivering a checkmate but after we capture the hanging rook, their bishop blocks the check. We are up a rook and the puzzle ends.

The remaining 8 puzzles are instead of bishop blocking, either the queen blocks, or a knight blocks protected by the queen.

## C. Opponent can capture our rook


## The End

And That's about it for our little journey into the vast world of chess tactics. If you enjoyed this post, make sure to follow, like and leave a comment so I can continue posting more adventures like this.