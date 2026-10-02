import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m5cbd6851 - kill by failed external call", function () {
  it("should revert when external call fails, but mutant returns true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token that does NOT implement transferFrom
    const tokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    const tos = [addr2.address];
    const v = 1;
    const decimals = 0;

    // Attempt to call transfer on airDrop with a token that will fail the external call
    // The original contract would revert, the mutant would return true
    await expect(
      instance.transfer(owner.address, token.target, tos, v, decimals)
    ).to.be.reverted;
  });
});