import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m11e9ea26 test", function () {
  it("should revert when player tries to play in the same block they wagered", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = owner.address;
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty to a non-zero value so the play function can compute
    await instance.connect(owner).AdjustDifficulty(10);
    
    // Player sends wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Attempt to play in the same block - should revert
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});