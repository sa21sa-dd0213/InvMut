import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m4b46e54e (transferFrom zero address check removed)", function () {
  it("should revert when transferring to address(0) in transferFrom (original behavior)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, give addr1 some tokens via the distr mechanism (owner calls NETM to get tokens, then transfer to addr1)
    // Or we can use the getTokens() function which requires msg.sender to not be blacklisted and distribution not finished
    // Simpler approach: call NETM() to give owner tokens, then transfer to addr1
    await instance.connect(owner).NETM();
    
    // Transfer some tokens from owner to addr1 so addr1 has a balance
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Now addr1 needs to approve owner to spend their tokens (for transferFrom)
    await instance.connect(addr1).approve(owner.address, transferAmount);
    
    // Attempt to transferFrom addr1 to address(0) - should revert in original, but not in mutant
    await expect(
      instance.connect(owner).transferFrom(addr1.address, ethers.ZeroAddress, transferAmount)
    ).to.be.reverted;
  });
});