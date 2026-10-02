import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - m0d99e683", function () {
  it("should revert when calling transfer with valid recipients (mutant always reverts)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a simple token contract to use as caddress (needed for the call)
    const tokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await tokenFactory.deploy("Mock", "MCK", 18);
    await token.waitForDeployment();
    
    // Fund addr1 with some tokens for transferFrom test
    await token.mint(addr1.address, ethers.parseEther("100"));
    
    // Approve the airDrop contract to spend from addr1 (not strictly needed for the test, but for proper setup)
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Prepare valid parameters: one recipient, value = 1, decimals = 18
    const recipients = [addr2.address];
    const value = 1;
    const decimals = 18;
    
    // The original contract should succeed with _tos.length > 0
    // The mutant (require(_tos.length < 0)) will always revert since length cannot be negative
    await expect(
      instance.transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        value,
        decimals
      )
    ).to.be.reverted;
  });
});