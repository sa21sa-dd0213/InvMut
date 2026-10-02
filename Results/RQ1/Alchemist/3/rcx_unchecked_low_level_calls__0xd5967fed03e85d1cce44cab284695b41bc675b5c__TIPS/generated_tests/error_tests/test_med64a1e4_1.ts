import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant detection - keccak256 vs sha256", function () {
  it("should detect mutant that replaces keccak256 with sha256 for function selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that implements transferFrom to verify correct selector
    const MockTokenFactory = await ethers.getContractFactory("contracts/MockToken.sol:MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();
    
    // Setup: give addr1 some tokens to transfer
    const transferAmount = ethers.parseEther("100");
    await mockToken.connect(owner).transfer(addr1.address, transferAmount);
    
    // Approve the demo contract to transfer on behalf of addr1
    await mockToken.connect(addr1).approve(await instance.getAddress(), transferAmount);
    
    // Create array with one recipient
    const recipients = [addr2.address];
    
    // This call should succeed on original (keccak256) but fail on mutant (sha256)
    // because the selector computed will be different
    await expect(
      instance.connect(owner).transfer(
        addr1.address,
        await mockToken.getAddress(),
        recipients,
        transferAmount
      )
    ).to.not.be.reverted;
    
    // Verify addr2 received the tokens (confirming correct selector was used)
    expect(await mockToken.balanceOf(addr2.address)).to.equal(transferAmount);
  });
});