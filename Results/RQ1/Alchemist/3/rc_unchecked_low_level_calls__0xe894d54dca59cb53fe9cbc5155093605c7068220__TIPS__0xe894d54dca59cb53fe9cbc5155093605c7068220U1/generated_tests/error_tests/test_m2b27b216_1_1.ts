import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6)", function () {
  it("should kill mutant m2b27b216 by executing a successful transferFrom call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Deploy airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const airDropAddress = await instance.getAddress();

    // Setup: owner approves airDrop contract to spend tokens
    const approveAmount = ethers.parseEther("100");
    await token.connect(owner).approve(airDropAddress, approveAmount);

    // Owner transfers tokens to addr1 so they have balance for transferFrom
    await token.connect(owner).transfer(addr1.address, ethers.parseEther("10"));

    // addr1 approves airDrop to spend their tokens
    await token.connect(addr1).approve(airDropAddress, ethers.parseEther("5"));

    // Prepare test: addr1 calls airDrop.transfer to move tokens from addr1 to addr2
    const recipients = [addr2.address];
    const value = ethers.parseEther("1");
    const decimals = 18; // Standard ERC20 decimals

    // This call should succeed on original but revert on mutant due to if(true)
    await expect(
      instance.connect(addr1).transfer(
        addr1.address,
        tokenAddress,
        recipients,
        value,
        decimals
      )
    ).to.not.be.reverted;
  });
});