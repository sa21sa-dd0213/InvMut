import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mf378e8e4 - UTILS proposal type check", function () {
  it("should kill mutant by verifying UTILS address change via finaliseProposal", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
        
    // Deploy mock contracts for VADER and VAULT interfaces
    const VADERFactory = await ethers.getContractFactory("MockVADER");
    const VADER = await VADERFactory.deploy();
    await VADER.waitForDeployment();
        
    const VAULTFactory = await ethers.getContractFactory("MockVAULT");
    const VAULT = await VAULTFactory.deploy();
    await VAULT.waitForDeployment();
        
    const USDVFactory = await ethers.getContractFactory("MockERC20");
    const USDV = await USDVFactory.deploy("USDV", "USDV", 18);
    await USDV.waitForDeployment();
        
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
        
    // Initialize DAO
    await dao.init(await VADER.getAddress(), await USDV.getAddress(), await VAULT.getAddress());
        
    // Set total weight in vault to enable voting
    await VAULT.setTotalWeight(ethers.parseEther("1000"));
        
    // Set member weight for owner
    await VAULT.setMemberWeight(owner.address, ethers.parseEther("600"));
        
    // Create UTILS proposal with new address
    const newUtilsAddress = addr1.address;
    await dao.newAddressProposal(newUtilsAddress, "UTILS");
    const proposalId = 1;
        
    // Vote on proposal (owner has majority)
    await dao.voteProposal(proposalId);
        
    // Check that proposal is finalising (coolOffPeriod = 1)
    const isFinalising = await dao.mapPID_finalising(proposalId);
    expect(isFinalising).to.be.true;
        
    // Advance time past coolOffPeriod
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
        
    // Call finaliseProposal - this should execute moveUtils on original but NOT on mutant
    await dao.finaliseProposal(proposalId);
        
    // Check the VADER contract's UTILS address - should be updated on original, unchanged on mutant
    const currentUtils = await VADER.UTILS();
        
    // On original: currentUtils should equal newUtilsAddress (addr1)
    // On mutant: currentUtils will remain as default (address(0)) because false prevents moveUtils
    expect(currentUtils).to.equal(newUtilsAddress);
  });
});