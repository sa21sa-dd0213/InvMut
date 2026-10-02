import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m079e7c1a test", function () {
  it("should revert when transferFrom fails (mutant should not revert)", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const ebu = await Factory.deploy();
    await ebu.waitForDeployment();
    
    // Deploy a simple token contract that will revert on transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/TestToken.sol:TestToken");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Setup: owner mints tokens to 'from' but doesn't approve the EBU contract
    await token.mint(from.address, ethers.parseEther("100"));
    
    // Create arrays for the transfer call
    const tos = [to.address];
    const values = [ethers.parseEther("10")];
    
    // Attempt to transfer - this should revert because EBU tries to call
    // transferFrom on the token, but 'from' hasn't approved EBU
    await expect(
      ebu.transfer(from.address, await token.getAddress(), tos, values)
    ).to.be.reverted;
  });
});