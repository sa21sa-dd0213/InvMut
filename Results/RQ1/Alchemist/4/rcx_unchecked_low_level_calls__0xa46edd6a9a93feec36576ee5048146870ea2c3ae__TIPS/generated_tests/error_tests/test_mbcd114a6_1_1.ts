import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - revert removal", function () {
  it("should revert when internal transferFrom fails, but mutant returns true", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for the test
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address
    await token.mint(from.address, ethers.parseEther("100"));

    // Setup: from gives allowance to EBU contract to spend tokens
    await token.connect(from).approve(instance.target, ethers.parseEther("50"));

    // Prepare call data: from tries to transfer tokens they don't have allowance for
    const recipients = [to.address];
    const amounts = [ethers.parseEther("60")]; // Exceeds allowance

    // Call transfer - this should revert in original but succeed in mutant
    const tx = instance.transfer(from.address, token.target, recipients, amounts);

    // We expect revert in original, so we test that
    await expect(tx).to.be.reverted;
  });
});