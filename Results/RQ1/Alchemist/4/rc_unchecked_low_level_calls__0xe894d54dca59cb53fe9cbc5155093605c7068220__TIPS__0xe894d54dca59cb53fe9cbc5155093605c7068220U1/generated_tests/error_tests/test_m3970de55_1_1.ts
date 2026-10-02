import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when a single transferFrom call fails in the batch (mutant detection)", async function () {
    const [owner, from, recipient1, recipient2] = await ethers.getSigners();

    // Deploy the airDrop contract (no constructor arguments needed based on the code)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as the caddress
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Setup: Transfer some tokens to the 'from' address and approve the airDrop contract
    await token.transfer(from.address, ethers.parseEther("100"));
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Setup: Give recipient1 enough balance to receive, but NOT recipient2 (to cause failure)
    // We'll set allowance for recipient2 to be too low, or simply not give them approval
    // Actually, transferFrom will fail if from doesn't have enough tokens OR if allowance is insufficient
    // Let's make it fail by having the 'from' address not have enough tokens for all transfers combined
    // Or better: make the token contract revert on transferFrom for one specific recipient

    // Deploy a malicious token that reverts on transferFrom for specific addresses
    const MaliciousTokenFactory = await ethers.getContractFactory("MaliciousToken");
    const maliciousToken = await MaliciousTokenFactory.deploy();
    await maliciousToken.waitForDeployment();

    // Have the from address approve the malicious token for the airDrop contract
    await maliciousToken.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // The malicious token will revert for recipient2 but succeed for recipient1
    const recipients = [recipient1.address, recipient2.address];
    const value = ethers.parseEther("1");
    const decimals = 18;

    // This should revert on the original because one transfer fails
    await expect(
      instance.transfer(from.address, await maliciousToken.getAddress(), recipients, value, decimals)
    ).to.be.reverted;
  });
});

// Helper contracts (these would be in separate files in a real setup)
// MockERC20 - standard ERC20
// MaliciousToken - ERC20 that reverts on transferFrom for specific addresses