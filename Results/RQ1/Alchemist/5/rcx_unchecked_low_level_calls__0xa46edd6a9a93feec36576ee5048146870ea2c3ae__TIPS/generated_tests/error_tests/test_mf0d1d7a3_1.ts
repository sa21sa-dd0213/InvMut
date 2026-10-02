import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mf0d1d7a3", function () {
  it("should revert when array length is 1 due to out-of-bounds access in mutant with <= loop condition", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20 token to use as caddress that will accept transfers
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Owner approves the EBU contract to transfer tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare arrays: one recipient with a value
    const recipients = [addr1.address];
    const values = [ethers.parseEther("10")];

    // Fund owner with tokens (already done in mock constructor)
    // Transfer tokens to owner for testing
    await token.transfer(owner.address, ethers.parseEther("100"));

    // The original would succeed with 1 recipient; the mutant should revert due to out-of-bounds access
    await expect(
      instance.transfer(owner.address, await token.getAddress(), recipients, values)
    ).to.be.reverted;
  });
});