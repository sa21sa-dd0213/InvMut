import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m36fe12f1", function () {
  it("should revert when tos.length < 0 condition fails (mutant always reverts)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20-like contract to use as contract_address
    const MinimalToken = await ethers.getContractFactory("TestERC20");
    const token = await MinimalToken.deploy();
    await token.waitForDeployment();

    // Setup: transfer some tokens to owner so they can transferFrom
    await token.transfer(owner.address, ethers.parseEther("100"));

    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Test with exactly 1 recipient - should pass on original (1 > 0) but fail on mutant (1 < 0 is false)
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];

    // The mutant changes require(tos.length > 0) to require(tos.length < 0)
    // Since array length is always >= 0, require(tos.length < 0) will ALWAYS revert
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});