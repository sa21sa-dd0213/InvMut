import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m75a34c3b - loseWager removal in play()", function () {
  it("should detect missing loseWager call when player loses", async function () {
    const [owner, whale, player] = await ethers.getSigners();

    // Deploy contract with whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to a value that makes losing deterministic
    // With difficulty = 2, winning number must be 1 (difficulty/2 = 1)
    // Since winningNumber = hash % 2 + 1, it will be either 1 or 2
    // We need to ensure player loses (winningNumber != 1)
    await instance.connect(owner).AdjustDifficulty(2);

    // Get whale's balance before playing
    const whaleBalanceBefore = await ethers.provider.getBalance(whale.address);

    // Player wagers
    await instance.connect(player).wager({ value: betLimit });

    // Mine a new block so block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);

    // Player plays - this should trigger loseWager if losing
    // With difficulty=2, winningNumber = hash % 2 + 1
    // There's 50% chance of winning (winningNumber == 1) and 50% losing (winningNumber == 2)
    // We'll play multiple times to ensure we hit a losing case
    let playerLost = false;
    let whaleBalanceAfter = whaleBalanceBefore;

    for (let i = 0; i < 10; i++) {
      // Re-deploy for clean state each attempt
      const newInstance = await Factory.deploy(whale.address, betLimit);
      await newInstance.waitForDeployment();
      await newInstance.connect(owner).OpenToThePublic();
      await newInstance.connect(owner).AdjustDifficulty(2);

      await newInstance.connect(player).wager({ value: betLimit });
      await ethers.provider.send("evm_mine", []);

      try {
        const tx = await newInstance.connect(player).play();
        const receipt = await tx.wait();

        whaleBalanceAfter = await ethers.provider.getBalance(whale.address);

        // Check if Lose event was emitted (means player lost)
        const loseEvents = receipt.logs.filter(
          (log: any) => log.topics[0] === ethers.id("Lose(uint256,address)")
        );

        if (loseEvents.length > 0) {
          playerLost = true;
          // Verify whale received the half bet limit
          expect(whaleBalanceAfter).to.equal(
            whaleBalanceBefore + betLimit / 2n
          );
          break;
        }
      } catch {
        continue;
      }
    }

    // Verify that a losing scenario was tested
    expect(playerLost).to.be.true;

    // Additional verification: whale balance should have increased
    expect(whaleBalanceAfter).to.be.gt(whaleBalanceBefore);
  });
});