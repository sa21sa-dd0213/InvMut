import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array has exactly one element due to out-of-bounds access in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token contract for the call
    const tokenFactory = await ethers.getContractFactory("MockToken");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: owner approves contract to spend tokens (simplified for test)
    // For the mutant to be killed, we call transfer with exactly one recipient
    const recipients = [addr2.address];
    const amount = ethers.parseEther("1");

    // The original contract works: i < 1 (loop runs once)
    // The mutant: i <= 1 (loop runs twice, accessing _tos[1] which is out of bounds)
    await expect(
      instance.transfer(owner.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;
  });
});