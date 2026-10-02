import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m06ece332 test", function () {
  it("should revert when transferring to non-zero address (mutant requires zero address)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_to != address(0)) to require(_to == address(0))
    // So transferring to a non-zero address should revert
    await expect(
      instance.connect(owner).transfer(addr1.address, ethers.parseEther("100"))
    ).to.be.reverted;
  });
});