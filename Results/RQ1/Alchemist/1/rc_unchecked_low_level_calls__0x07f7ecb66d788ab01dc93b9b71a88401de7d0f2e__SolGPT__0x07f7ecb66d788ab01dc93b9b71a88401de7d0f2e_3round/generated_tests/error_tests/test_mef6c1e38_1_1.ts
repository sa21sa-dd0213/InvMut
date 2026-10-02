import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mef6c1e38", function () {
  it("should revert when wager and play are called in the same block", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to the public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty to a non-zero value so play() logic works
    await instance.connect(owner).AdjustDifficulty(10);
    
    // addr1 makes a wager
    await instance.connect(addr1).wager({ value: wagerLimit });
    
    // Attempt to play in the same block - should revert in original contract
    // because blockNumber (current block) is not < block.number
    await expect(
      instance.connect(addr1).play()
    ).to.be.reverted;
  });
});