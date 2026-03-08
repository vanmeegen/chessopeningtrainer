# Chess Opening Trainer (COT)

- Idea: Create a free for everyone Chess opening trainer as PWA which can be used without server by everyone to 
      learn chess openings. It should be a mixture of vocabulary card memorization combined with strategic understanding,
      memorizing because the user understands the ideas, not only learning without understanding.
- The opening database and strategic explanation should be stored in the github repository itself, so no database needed,
  but no online updates without a new release too.
- The screen should be optimized for mobile and ipad, so both screen sizes should optimize screen space to 
  display the chess board and the reasoning behind the last move.

# Main User journeys
## User wants to learn a specific opening (optional with specific variant). COT will suggest moves and comment on 
  strategic impact dependent on which variant he chooses. COT will list possible variants if user wants to show together
  with a strength rating from 1-10. 
## User just plays against the computer and the computer uses stockfish engine or database to determine the next move,
   commenting on the current opening name and variant and if a move is considered good, ok, or bad.

## User wants to memorize opening, so selects an opening and optional specific variant and COT will let him play and after
   each correct move it will comment on what the user did and if it is still correct variant the user wanted to learn.
   COT memorizes the correct moves and place a memorization rank on the variant, so the user will not be asked anymore
   for a long time if he successfully memorized the opening.
   
