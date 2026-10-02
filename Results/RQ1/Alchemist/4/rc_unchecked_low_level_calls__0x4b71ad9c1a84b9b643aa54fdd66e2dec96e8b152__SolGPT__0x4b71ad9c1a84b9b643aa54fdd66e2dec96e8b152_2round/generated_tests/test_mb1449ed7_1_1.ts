import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect the mutant that changes i<_tos.length to i<=_tos.length by causing an out-of-bounds access", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract that implements transferFrom for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund addr1 with tokens
    await token.transfer(addr1.address, ethers.parseEther("100"));
    // Approve the airPort contract to spend tokens from addr1
    await token.connect(addr1).approve(instance.target, ethers.parseEther("100"));

    // Create array with single recipient
    const recipients = [addr2.address];
    const value = ethers.parseEther("10");

    // The original contract would succeed with 1 recipient
    // The mutant with i<=_tos.length will try to access _tos[1] which doesn't exist, causing a revert
    await expect(
      instance.connect(addr1).transfer(
        addr1.address,
        token.target,
        recipients,
        value
      )
    ).to.be.reverted;
  });
});