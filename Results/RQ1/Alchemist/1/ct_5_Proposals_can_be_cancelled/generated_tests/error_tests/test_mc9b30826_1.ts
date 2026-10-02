import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mc9b30826 - hasMajority always returns false", function () {
  it("should detect that hasMajority never returns true even when votes exceed 50% of total weight", async function () {
    const [owner, addr1, addr2, vaultMock, vaderMock] = await ethers.getSigners();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy mock VADER contract
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();
    
    // Deploy mock VAULT contract
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), ethers.ZeroAddress, await vault.getAddress());
    
    // Setup vault mock to return specific totalWeight and member weight
    // For a DAO type proposal, we need totalWeight/2 + 1 to achieve majority
    // Let's make totalWeight = 1000, so majority needs > 500 votes
    await vault.mockTotalWeight(1000);
    await vault.mockGetMemberWeight(addr1.address, 600); // addr1 has 600 weight (> 50%)
    
    // Create a DAO type proposal (using newAddressProposal with type "DAO")
    await dao.connect(addr1).newAddressProposal(addr2.address, "DAO");
    
    // Vote on proposal 1 - this should trigger hasMajority check in voteProposal
    // In original: hasMajority returns true (600 > 500), so _finalise is called
    // In mutant: hasMajority returns false, so _finalise is NOT called
    await dao.connect(addr1).voteProposal(1);
    
    // Check if proposal was finalised (mapPID_finalising should be true)
    // In original: true because hasMajority returned true
    // In mutant: false because hasMajority always returns false
    const isFinalising = await dao.mapPID_finalising(1);
    
    // This assertion will pass on original but fail on mutant
    expect(isFinalising).to.equal(true);
  });
});