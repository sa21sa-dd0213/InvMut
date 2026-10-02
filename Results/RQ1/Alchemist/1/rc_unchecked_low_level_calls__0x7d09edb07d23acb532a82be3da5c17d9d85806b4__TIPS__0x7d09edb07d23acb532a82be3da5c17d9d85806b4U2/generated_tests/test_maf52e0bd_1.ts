import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - maf52e0bd", function () {
  it("should revert when play() is called in the same block as wager()", async function () {
    const [owner, player] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty so we don't hit issues
    await instance.connect(owner).AdjustDifficulty(10);
    
    // Player makes a wager
    await instance.connect(player).wager({ value: wagerLimit });
    
    // Immediately call play() in the same block - should revert in original, but mutant may not
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});