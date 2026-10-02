import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m32824c71", function () {
  it("should revert when transferring to a non-zero address (mutant requires _to == address(0))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("1000");
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Mutant changed require(_to != address(0)) to require(_to == address(0))
    // Original: transfers to non-zero address should succeed
    // Mutant: transfers to non-zero address should revert
    await expect(
      instance.connect(owner).transfer(addr1.address, ethers.parseEther("100"))
    ).to.be.reverted;
  });
});