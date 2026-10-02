import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc00f91a2 test", function () {
  it("should revert when _tos array is empty (original) but pass on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as caddress
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // This should revert on the original (require > 0) but pass on the mutant (require >= 0)
    await expect(
      instance.transfer(owner.address, await token.getAddress(), emptyAddresses, value)
    ).to.be.reverted;
  });
});