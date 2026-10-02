import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m36fe12f1", function () {
  it("should succeed with valid non-empty tos array on original, but fail on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address for transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare test data: one recipient with a value
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];

    // This should succeed on original but revert on mutant due to tos.length < 0 always being false
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.not.be.reverted;
  });
});