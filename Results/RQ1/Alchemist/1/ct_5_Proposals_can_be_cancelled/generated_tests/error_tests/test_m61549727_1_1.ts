import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - VAULT set to address(0)", function () {
  it("should revert when calling any VAULT-dependent function after init with address(0) VAULT", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts for VADER and VAULT
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    
    const mockVADER = await VADERFactory.deploy();
    const mockVAULT = await VAULTFactory.deploy();
    
    await mockVADER.waitForDeployment();
    await mockVAULT.waitForDeployment();
    
    // Deploy the DAO contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize with VAULT set to address(0) to trigger the mutant behavior
    await dao.init(await mockVADER.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress);
    
    // Create a proposal so we can test VAULT interaction
    await dao.newAddressProposal(addr1.address, "UTILS");
    
    // Try to vote on the proposal - this will call countMemberVotes which uses VAULT.getMemberWeight
    // On the mutant, VAULT is address(0), so this should revert
    await expect(dao.voteProposal(1)).to.be.reverted;
    
    // Also test hasQuorum which uses VAULT.totalWeight()
    await expect(dao.hasQuorum(1)).to.be.reverted;
    
    // Test hasMajority which also uses VAULT.totalWeight()
    await expect(dao.hasMajority(1)).to.be.reverted;
    
    // Test hasMinority which also uses VAULT.totalWeight()
    await expect(dao.hasMinority(1)).to.be.reverted;
  });
});