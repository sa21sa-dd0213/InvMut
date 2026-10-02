import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m8099f82a test", function () {
  it("should revert when array length is exactly 1 due to off-by-one error in loop", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("airDrop");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Since airDrop contract doesn't have its own token, we need a token that implements transferFrom
    // For testing purposes, we'll use a minimal token contract
    const MinimalTokenFactory = await ethers.getContractFactory("contracts/MinimalToken.sol:MinimalToken");
    const minimalToken = await MinimalTokenFactory.deploy();
    await minimalToken.waitForDeployment();
    
    // Setup: give from address some tokens and approve the airDrop contract
    await minimalToken.mint(from.address, ethers.parseEther("100"));
    await minimalToken.connect(from).approve(await token.getAddress(), ethers.parseEther("100"));
    
    // Prepare test data
    const tos = [to.address];
    const value = ethers.parseEther("1");
    const decimals = 18;
    
    // This should revert on the mutant because loop goes to i <= _tos.length (i=1) causing out-of-bounds
    await expect(
      token.connect(owner).transfer(
        from.address,
        await minimalToken.getAddress(),
        tos,
        value,
        decimals
      )
    ).to.be.reverted;
  });
});