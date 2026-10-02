import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m88789022", function () {
  it("should kill mutant by triggering out-of-bounds access with single-element array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token contract that has transferFrom for the call
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Owner approves demo contract to spend tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Fund addr1 with some tokens
    await token.transfer(addr1.address, ethers.parseEther("50"));

    // Setup: addr1 approves demo contract to spend their tokens
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("50"));

    // Call with single-element arrays - original passes, mutant fails with out-of-bounds
    await expect(
      instance.transfer(
        addr1.address,
        await token.getAddress(),
        [addr2.address],
        [ethers.parseEther("10")]
      )
    ).to.be.reverted;
  });
});