import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PoCGame mutant m7f0e38a1 test", function () {
  it("should revert when play() is called in the same block as wager()", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens the game to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to ensure winning condition doesn't interfere
    const difficulty = 100;
    await instance.connect(owner).AdjustDifficulty(difficulty);

    // Player places a wager
    await instance.connect(player).wager({ value: betLimit });

    // Attempt to play in the same block - should revert in original
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});