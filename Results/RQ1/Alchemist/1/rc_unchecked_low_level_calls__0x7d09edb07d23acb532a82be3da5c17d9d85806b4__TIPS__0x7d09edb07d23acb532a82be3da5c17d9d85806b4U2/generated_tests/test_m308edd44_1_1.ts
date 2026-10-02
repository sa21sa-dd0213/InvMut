import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame - Kill mutant m308edd44 (Lose event emission removed)", function () {
  it("should emit Lose event when player loses a wager", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const difficulty = 10;

    // Deploy contract
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Setup: Open to public, set difficulty
    await instance.connect(owner).OpenToThePublic();
    await instance.connect(owner).AdjustDifficulty(difficulty);

    // Player makes a wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    await wagerTx.wait();

    // Mine blocks to ensure block.number > blockNumber stored in timestamps
    await ethers.provider.send("evm_mine", []);

    // Play - this should trigger loseWager since winningNumber won't equal difficulty/2 (5)
    // The probability of losing is very high (9/10)
    const playTx = await instance.connect(player).play();

    // Assert that Lose event was emitted with correct parameters
    await expect(playTx)
      .to.emit(instance, "Lose")
      .withArgs(betLimit / 2n, player.address);
  });
});