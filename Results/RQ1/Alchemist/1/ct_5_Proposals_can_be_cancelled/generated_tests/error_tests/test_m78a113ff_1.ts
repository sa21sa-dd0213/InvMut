import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant test - m78a113ff hasMajority", function () {
  it("should detect mutant by checking hasMajority returns true when votes > consensus", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DAO with constructor arguments (no constructor args in this case)
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy mock VAULT to control totalWeight
    // We need a simple vault that returns controlled weights
    const VaultFactory = await ethers.getContractFactory("contracts/VAULT.sol:VAULT");
    const vault = await VaultFactory.deploy();
    await vault.waitForDeployment();
    
    // Deploy mock VADER and USDV (minimal contracts)
    const VaderFactory = await ethers.getContractFactory("contracts/VADER.sol:VADER");
    const vader = await VaderFactory.deploy();
    await vader.waitForDeployment();
    
    const UsdvFactory = await ethers.getContractFactory("contracts/USDV.sol:USDV");
    const usdv = await UsdvFactory.deploy();
    await usdv.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Create a proposal to have a proposalID to test hasMajority
    await dao.newAddressProposal(addr1.address, "DAO");
    
    // Setup vault to return specific weights
    // We need totalWeight to be 100 and member weight to be 60 for owner
    // This means votes > consensus (50) should be true
    await vault.setMemberWeight(owner.address, 60);
    await vault.setTotalWeight(100);
    
    // Vote on proposal to trigger hasMajority check indirectly
    // But we can also call hasMajority directly as it's public
    const proposalId = 1;
    
    // First vote to set votes
    await dao.connect(owner).voteProposal(proposalId);
    
    // Now check hasMajority - should return true with 60 votes out of 100 total
    const result = await dao.hasMajority(proposalId);
    
    // On original: votes(60) > consensus(50) => true
    // On mutant: votes(60) < consensus(50) => false
    // Test expects true, which will fail on mutant
    expect(result).to.be.true;
  });
});