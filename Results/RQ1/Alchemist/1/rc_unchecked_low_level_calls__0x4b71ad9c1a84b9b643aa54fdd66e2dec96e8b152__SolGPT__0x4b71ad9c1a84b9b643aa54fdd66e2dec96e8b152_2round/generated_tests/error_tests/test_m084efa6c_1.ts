import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m084efa6c test", function () {
  it("should revert when one transferFrom call fails (original behavior), but mutant silently succeeds", async function () {
    const [owner, from, unauthorizedReceiver] = await ethers.getSigners();
    
    // Deploy a mock token that will make transferFrom fail for unauthorizedReceiver
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy();
    await token.waitForDeployment();
    
    // Deploy the airPort contract
    const Factory = await ethers.getContractFactory("airPort");
    const airPort = await Factory.deploy();
    await airPort.waitForDeployment();
    
    // Setup: from address approves airPort to transfer tokens
    await token.connect(from).approve(await airPort.getAddress(), ethers.parseEther("100"));
    
    // Create recipients array where first is authorized, second is not
    const recipients = [owner.address, unauthorizedReceiver.address];
    
    // Call transfer with from having insufficient balance for unauthorizedReceiver
    // The original contract would revert because transferFrom fails for unauthorizedReceiver
    // The mutant would silently continue and return true
    const tx = await airPort.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("10")
    );
    
    // For the original contract, this would revert
    // For the mutant, it succeeds (but we can detect it by checking no tokens were transferred)
    await expect(tx).to.be.reverted;
  });
});