import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant med14c137", function () {
  it("should detect mutant where if(true) replaces if(!_s) - call with valid external contract that succeeds", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor args needed)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();
    
    // Deploy a simple ERC20-like contract that can receive transferFrom calls
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();
    
    // Setup: mint tokens to owner and approve demo contract to spend them
    const mintAmount = ethers.parseEther("100");
    await mockToken.mint(owner.address, mintAmount);
    await mockToken.approve(await demo.getAddress(), mintAmount);
    
    // Create recipient addresses
    const recipients = [owner.address]; // self-transfer for simplicity
    
    // Call transfer - this should succeed on original (call returns true)
    // but fail on mutant (always reverts due to if(true))
    const tx = demo.transfer(
      owner.address,
      await mockToken.getAddress(),
      recipients,
      ethers.parseEther("10")
    );
    
    // The mutant will revert, so expect success on original but we're testing mutant
    await expect(tx).to.be.reverted;
  });
});