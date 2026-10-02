import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant me412f287 - loseWager removal in play()", function () {
  it("should detect that loseWager is not called on losing play", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const difficulty = 10; // Even number so difficulty/2 = 5

    // Deploy contract
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty
    await instance.connect(owner).AdjustDifficulty(difficulty);

    // Player makes a wager
    await instance.connect(player).wager({ value: betLimit });

    // Get whale balance before play
    const whaleBalanceBefore = await ethers.provider.getBalance(whale.address);

    // Play - this should result in a loss (winningNumber != difficulty/2)
    // The player will lose because the random calculation won't hit exactly difficulty/2 = 5
    const tx = await instance.connect(player).play();
    const receipt = await tx.wait();

    // Check that NO Lose event was emitted (mutant removed the emit)
    const loseEvents = receipt.logs.filter(
      (log) => log.topics[0] === ethers.id("Lose(uint256,address,address)")
    );
    expect(loseEvents.length).to.equal(0, "Mutant should not emit Lose event");

    // Check that whale balance did NOT increase (mutant removed the transfer)
    const whaleBalanceAfter = await ethers.provider.getBalance(whale.address);
    expect(whaleBalanceAfter).to.equal(
      whaleBalanceBefore,
      "Mutant should not transfer ETH to whale on losing play"
    );
  });
});