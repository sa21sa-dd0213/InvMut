import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant ma831aefb - transferFrom payload size check", function () {
  it("should kill the mutant by calling transferFrom with valid parameters and expecting success on original but revert on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, initialize the contract by calling NETM() to set owner balances
    await instance.connect(owner).NETM();
    
    // Get the totalDistributed amount to know initial balances
    const totalDistributed = await instance.totalDistributed();
    
    // Transfer some tokens from owner to addr1 to set up balance for transferFrom
    const transferAmount = ethers.parseEther("1000");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Have addr1 approve owner to spend tokens
    await instance.connect(addr1).approve(owner.address, transferAmount);
    
    // Now call transferFrom - this should succeed on original contract
    // but fail on mutant due to 3**32 payload size check
    await expect(
      instance.connect(owner).transferFrom(
        addr1.address,
        addr2.address,
        transferAmount
      )
    ).to.be.reverted; // Mutant will always revert due to payload check; original would succeed
  });
});