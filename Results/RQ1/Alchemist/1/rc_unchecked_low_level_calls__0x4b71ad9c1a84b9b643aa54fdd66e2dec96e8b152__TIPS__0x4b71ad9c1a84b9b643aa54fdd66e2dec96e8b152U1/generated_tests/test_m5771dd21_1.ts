import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant m5771dd21 test", function () {
  it("should kill mutant by calling transfer with valid token contract", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like contract that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/SimpleERC20.sol:SimpleERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the airPort contract (no constructor args needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: mint tokens to owner and approve airPort contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(instance.target, mintAmount);
    
    // Create recipients array
    const recipients = [addr1.address];
    const transferAmount = ethers.parseEther("10");
    
    // Call transfer - should succeed on original, fail on mutant
    // Mutant uses sha256 instead of keccak256, causing wrong function selector
    await expect(
      instance.connect(owner).transfer(
        owner.address,
        token.target,
        recipients,
        transferAmount
      )
    ).to.be.reverted;
  });
});