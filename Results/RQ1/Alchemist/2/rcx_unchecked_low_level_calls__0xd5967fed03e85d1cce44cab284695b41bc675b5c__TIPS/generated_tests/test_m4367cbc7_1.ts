import { expect } from "chai";
import { ethers } } from "hardhat";

describe("demo mutant kill test - m4367cbc7", function () {
  it("should revert when a nested call fails, but mutant silently continues", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like contract that will fail on transferFrom
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Setup: give addr1 some tokens and approve demo to spend them
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Create recipients array with multiple addresses
    const recipients = [addr2.address, addr2.address];
    
    // Try to call transfer with a failing call - use a non-existent token address
    const fakeTokenAddress = ethers.Wallet.createRandom().address;
    
    // This should revert on original but succeed on mutant
    await expect(
      instance.transfer(addr1.address, fakeTokenAddress, recipients, ethers.parseEther("10"))
    ).to.be.reverted;
    
    // If we get here, the mutant is killed because it didn't revert
    // (the test expects revert, so if it doesn't revert, the test fails)
  });
});