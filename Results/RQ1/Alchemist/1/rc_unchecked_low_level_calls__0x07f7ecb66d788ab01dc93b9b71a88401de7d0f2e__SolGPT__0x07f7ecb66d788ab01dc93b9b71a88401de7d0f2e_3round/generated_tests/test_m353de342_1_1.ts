import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - loseWager event emission", function () {
  it("should emit Lose event when player loses a wager", async function () {
    const [owner, whale, player] = await ethers.getSigners();

    // Deploy contract with constructor arguments: whale address and betLimit
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open the game to the public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to a value that ensures losing condition
    // difficulty/2 must not equal the winning number
    await instance.connect(owner).AdjustDifficulty(10);

    // Player places a wager
    await instance.connect(player).wager({ value: betLimit });

    // Get current block number to know when the wager was placed
    const wagerBlock = await ethers.provider.getBlockNumber();

    // Mine a new block so block.number > blockNumber condition is met
    await ethers.provider.send("evm_mine", []);

    // Now call play() - this should trigger loseWager since winningNumber != difficulty/2
    // We expect the Lose event to be emitted with the correct parameters
    await expect(instance.connect(player).play())
      .to.emit(instance, "Lose")
      .withArgs(betLimit / 2n, player.address);
  });
});