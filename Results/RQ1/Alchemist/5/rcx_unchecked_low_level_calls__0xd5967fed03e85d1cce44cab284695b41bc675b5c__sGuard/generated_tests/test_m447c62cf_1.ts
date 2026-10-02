import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant test for m447c62cf", function () {
  it("should revert when loop uses <= instead of < causing out-of-bounds access", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract to use as the 'caddress' parameter
    const tokenFactory = await ethers.getContractFactory("MockToken");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    // Fund owner with tokens to transfer
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.approve(instance.target, ethers.parseEther("1000"));

    // Test case: array with one element - should revert in mutant due to i <= length
    const recipients = [addr1.address];
    await expect(
      instance.transfer(owner.address, token.target, recipients, ethers.parseEther("10"))
    ).to.be.reverted;
  });
});