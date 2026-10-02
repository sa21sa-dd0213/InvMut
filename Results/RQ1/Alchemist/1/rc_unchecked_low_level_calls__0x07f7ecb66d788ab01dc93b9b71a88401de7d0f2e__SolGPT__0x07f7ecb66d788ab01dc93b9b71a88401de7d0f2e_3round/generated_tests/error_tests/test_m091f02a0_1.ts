import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m091f02a0", function () {
  it("should revert when calling play() without a wager (onlyPlayers modifier removed)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr2.address, betLimit);
    await instance.waitForDeployment();

    // Open the game to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to a non-zero value to avoid division by zero
    await instance.connect(owner).AdjustDifficulty(10);

    // addr1 does NOT call wager(), so wagers[addr1] == 0
    // Attempt to call play() directly - should revert in original but proceed in mutant
    await expect(
      instance.connect(addr1).play()
    ).to.be.reverted;
  });
});