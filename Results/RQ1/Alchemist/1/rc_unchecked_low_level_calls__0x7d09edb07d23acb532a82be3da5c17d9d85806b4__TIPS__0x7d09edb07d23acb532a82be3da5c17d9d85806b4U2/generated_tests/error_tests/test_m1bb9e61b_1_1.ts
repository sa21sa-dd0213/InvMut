import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m1bb9e61b test", function () {
  it("should revert when play() is called twice in the same block", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, betLimit);
    await instance.waitForDeployment();

    // Open the game to the public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty so that winning condition is possible (e.g., difficulty = 2)
    await instance.connect(owner).AdjustDifficulty(2);

    // First wager from addr1
    await instance.connect(addr1).wager({ value: betLimit });

    // First play in the same block (should succeed)
    await instance.connect(addr1).play();

    // Second play in the same block should revert because timestamps[msg.sender] is now 0
    // and blockNumber (0) is NOT less than current block.number
    await expect(
      instance.connect(addr1).play()
    ).to.be.reverted;
  });
});