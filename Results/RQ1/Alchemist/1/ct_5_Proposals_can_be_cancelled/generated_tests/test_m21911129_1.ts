import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m21911129 - isEqual hash function change", function () {
  it("should revert cancelProposal when comparing identical proposal types because isEqual uses different hash algorithms", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the DAO contract
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy mock VADER contract (minimal interface implementation)
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVader = await MockVADER.deploy();
    await mockVader.waitForDeployment();
    
    // Deploy mock VAULT contract
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVault = await MockVAULT.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVader.getAddress(), ethers.ZeroAddress, await mockVault.getAddress());
    
    // Create two proposals of the same type "DAO"
    await dao.newAddressProposal(addr1.address, "DAO");
    await dao.newAddressProposal(addr1.address, "DAO");
    
    // Vote on proposal 2 to give it minority (need > totalWeight/6)
    await mockVault.setMemberWeight(owner.address, 100);
    await mockVault.setTotalWeight(600);
    await dao.voteProposal(2);
    
    // Vote on proposal 1 to give it majority and trigger finalising
    await dao.voteProposal(1);
    
    // Now attempt to cancel proposal 1 using proposal 2
    // They should be considered equal types in original (both "DAO")
    // but mutant's isEqual will fail because it compares keccak256 vs sha256
    await expect(
      dao.cancelProposal(1, 2)
    ).to.be.revertedWith("Must be same");
  });
});