import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mcf4fc81d test", function () {
  it("should revert when wagering with value different from betLimit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Try to wager with 0.5 ETH instead of 1 ETH - should revert on original but pass on mutant
    await expect(
      instance.connect(addr1).wager({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});