import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test for hasMajority", function () {
  it("should detect mutant that removed return false in hasMajority when votes <= consensus", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER and VAULT contracts
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize DAO with mock addresses
    await instance.init(await mockVADER.getAddress(), ethers.ZeroAddress, await mockVAULT.getAddress());
    
    // Create a proposal so we have something to vote on
    await instance.connect(addr1).newAddressProposal(addr2.address, "DAO");
    
    // Get totalWeight from mock vault (will be 0 initially)
    // The mutant's hasMajority will fail to return false when votes <= consensus
    // Since totalWeight is 0, consensus = 0/2 = 0, votes = 0, so votes > consensus is false
    // Original returns false, mutant fails to return
    
    // Call hasMajority - should return false
    const result = await instance.hasMajority(1);
    
    // Assert that result is false
    expect(result).to.equal(false);
  });
});

// Mock VADER contract for testing
// Mock VAULT contract for testing