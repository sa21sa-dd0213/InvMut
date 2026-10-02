import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending to zero address (detects removal of zero-address check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract requires receiver != address(0) and reverts.
    // The mutant removes that require, so sending to address(0) would not revert.
    await expect(
      instance.connect(owner).sendTo(ethers.ZeroAddress, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});