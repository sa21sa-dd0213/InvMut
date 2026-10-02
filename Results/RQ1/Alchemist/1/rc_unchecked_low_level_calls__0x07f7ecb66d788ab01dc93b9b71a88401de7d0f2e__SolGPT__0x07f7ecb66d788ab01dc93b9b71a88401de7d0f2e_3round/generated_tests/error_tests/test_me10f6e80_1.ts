import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - me10f6e80", function () {
  it("should detect the betLimit / 2 vs betLimit + 2 mutation in play() function", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to ensure a deterministic loss (winningNumber != difficulty / 2)
    // Use difficulty = 4, so difficulty / 2 = 2, and winningNumber will be 1, 2, 3, or 4
    // We'll make the player lose by ensuring they don't hit exactly 2
    await instance.connect(owner).AdjustDifficulty(4);

    // Player places a wager
    await instance.connect(player).wager({ value: betLimit });

    // Mine a block to advance block.number so the play() condition passes
    await ethers.provider.send("evm_mine", []);

    // Get contract balance before playing (should be betLimit from wager)
    const balanceBefore = await instance.ethBalance();

    // Player calls play() - this will trigger loseWager since winningNumber won't be 2
    await instance.connect(player).play();

    // Get contract balance after playing
    const balanceAfter = await instance.ethBalance();

    // In the original: loseWager(betLimit / 2) = 0.5 ETH sent to whale
    // In the mutant: loseWager(betLimit + 2) = 1 ETH + 2 wei sent to whale
    // Expected original behavior: contract balance should decrease by betLimit / 2
    const expectedLoss = betLimit / 2n;
    const actualLoss = balanceBefore - balanceAfter;

    // If the mutant is present, actualLoss will be betLimit + 2n instead of betLimit / 2n
    expect(actualLoss).to.equal(expectedLoss);
  });
});