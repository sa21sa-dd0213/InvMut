import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6)", function () {
  it("should revert when non-owner calls burn (kill mutant m5698932d)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, owner distributes some tokens to addr1 so addr1 has a balance to burn
    await instance.connect(owner).getTokens({ value: ethers.parseEther("1") });
    // Transfer some tokens from owner to addr1
    await instance.connect(owner).transfer(addr1.address, ethers.parseEther("100"));
    
    // addr1 tries to burn its own tokens - should revert in original (onlyOwner), but succeed in mutant
    await expect(
      instance.connect(addr1).burn(ethers.parseEther("10"))
    ).to.be.reverted;
  });
});