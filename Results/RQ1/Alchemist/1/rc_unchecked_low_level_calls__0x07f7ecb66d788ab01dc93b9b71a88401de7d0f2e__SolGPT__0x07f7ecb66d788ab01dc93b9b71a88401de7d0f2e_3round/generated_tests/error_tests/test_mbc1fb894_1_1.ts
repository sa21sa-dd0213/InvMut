import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - payout calculation", function () {
  it("should detect mutant that changes payout from balance/2 to balance+2", async function () {
    const [owner, whale, player] = await ethers.getSigners();

    // Deploy with whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to ensure win condition (winningNumber == difficulty / 2)
    // With difficulty = 2, difficulty/2 = 1, winningNumber = hash % 2 + 1 = 1 or 2
    // We need winningNumber == 1, so 50% chance - let's retry until we get a win
    await instance.connect(owner).AdjustDifficulty(2);

    // Player makes a wager
    await instance.connect(player).wager({ value: betLimit });

    // Mine a block to ensure block.number > blockNumber (timestamps[player])
    await ethers.provider.send("evm_mine", []);

    // Play the game - if winningNumber == 1 (difficulty/2), player wins
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber - 1);
    const randomSeed = 0n; // Default value since not set in constructor
    const winningNumber = BigInt(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "uint256"],
          [block!.hash, player.address, randomSeed]
        )
      )
    ) % 2n + 1n;

    if (winningNumber === 1n) {
      // Player wins - original contract sends balance/2, mutant sends balance+2
      const balanceBefore = await ethers.provider.getBalance(instance.target);
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);

      await instance.connect(player).play();

      const playerBalanceAfter = await ethers.provider.getBalance(player.address);
      const actualPayout = playerBalanceAfter - playerBalanceBefore;

      // Original would transfer balance/2
      const expectedPayout = balanceBefore / 2n;

      // Mutant would try to transfer balance+2 which would revert or transfer wrong amount
      // If transaction succeeded, the payout should be exactly half
      expect(actualPayout).to.equal(expectedPayout);
    } else {
      // Player didn't win, need to test with a new wager
      // Create a new player for a fresh wager
      const [player2] = await ethers.getSigners();
      
      // Player2 makes a wager
      await instance.connect(player2).wager({ value: betLimit });
      await ethers.provider.send("evm_mine", []);

      // Calculate winning number for player2
      const blockNumber2 = await ethers.provider.getBlockNumber();
      const block2 = await ethers.provider.getBlock(blockNumber2 - 1);
      const winningNumber2 = BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "address", "uint256"],
            [block2!.hash, player2.address, randomSeed]
          )
        )
      ) % 2n + 1n;

      if (winningNumber2 === 1n) {
        const balanceBefore = await ethers.provider.getBalance(instance.target);
        const playerBalanceBefore = await ethers.provider.getBalance(player2.address);

        await instance.connect(player2).play();

        const playerBalanceAfter = await ethers.provider.getBalance(player2.address);
        const actualPayout = playerBalanceAfter - playerBalanceBefore;
        const expectedPayout = balanceBefore / 2n;

        expect(actualPayout).to.equal(expectedPayout);
      } else {
        // If still no win, test winnersPot function indirectly
        // Just verify that winnersPot returns half the balance
        const contractBalance = await ethers.provider.getBalance(instance.target);
        const halfBalance = contractBalance / 2n;
        const winnersPot = await instance.winnersPot();
        expect(winnersPot).to.equal(halfBalance);
      }
    }
  });
});