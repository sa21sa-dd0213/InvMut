import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant kill test - voteProposal operator change", function () {
  it("should detect mutant by testing UTILS proposal requires majority, not just quorum", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VADER mock (simplified interface)
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();
    
    // Deploy VAULT mock with totalWeight functionality
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();
    
    // Deploy USDV mock for balance checks
    const USDVFactory = await ethers.getContractFactory("iERC20");
    const usdv = await USDVFactory.deploy();
    await usdv.waitForDeployment();
    
    // Deploy the DAO contract
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO with mock addresses
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Setup: Create UTILS proposal
    const utilsAddress = addr1.address;
    await dao.connect(owner).newAddressProposal(utilsAddress, "UTILS");
    
    // Get total weight from vault mock (we need to set it up)
    // For this test, we need totalWeight to be > 0
    // Let's assume vault.totalWeight() returns 1000
    
    // Cast vote from owner (weight needs to be > 1/3 but < 1/2 of totalWeight)
    // If totalWeight = 1000, we need votes between 334 and 500
    await dao.connect(owner).voteProposal(1);
    
    // Check proposal is finalising (should NOT be finalising if majority required)
    // In original: UTILS requires majority, so it should NOT finalise
    // In mutant: UTILS skips majority check, so it WILL finalise
    
    const isFinalising = await dao.mapPID_finalising(1);
    
    // Original behavior: should NOT be finalising yet (only has quorum, not majority)
    expect(isFinalising).to.be.false;
    
    // Now add more votes to reach majority
    await dao.connect(addr2).voteProposal(1);
    
    // Now proposal should be finalising
    const isFinalisingAfterMajority = await dao.mapPID_finalising(1);
    expect(isFinalisingAfterMajority).to.be.true;
  });
});