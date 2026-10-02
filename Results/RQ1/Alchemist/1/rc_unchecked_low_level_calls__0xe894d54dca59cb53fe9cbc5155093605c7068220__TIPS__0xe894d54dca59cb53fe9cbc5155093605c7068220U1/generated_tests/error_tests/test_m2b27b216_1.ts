import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airDrop mutant detection test", function () {
  it("should detect mutant that replaces !_s with true by verifying successful transfer does not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to addr1 and approve the airDrop contract to spend from addr1
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);
    await token.connect(addr1).approve(owner.address, mintAmount);
    
    // Deploy the airDrop contract
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare transfer parameters
    const tos = [addr2.address];
    const value = ethers.parseEther("10");
    const decimals = 18;
    
    // Call transfer - should succeed on original, revert on mutant
    const tx = instance.connect(owner).transfer(
      addr1.address,
      await token.getAddress(),
      tos,
      value,
      decimals
    );
    
    // The mutant always reverts, so we expect the transaction to succeed
    // If the transaction reverts, the test fails (mutant detected)
    await expect(tx).to.not.be.reverted;
  });
});