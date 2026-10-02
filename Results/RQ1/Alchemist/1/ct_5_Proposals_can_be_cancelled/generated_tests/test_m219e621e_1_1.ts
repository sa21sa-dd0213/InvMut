import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m219e621e test", function () {
  it("should kill mutant by proving REWARD proposal executes wrong logic when isEqual(_type, 'UTILS') is replaced with true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts for VADER, USDV, and VAULT
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockERC20.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();
    
    // Deploy mock VADER that tracks which function was called
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    // Deploy mock VAULT
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
    
    // Create a REWARD proposal (not UTILS)
    await dao.newAddressProposal(addr2.address, "REWARD");
    
    // Vote to get quorum (need > 1/3 of totalWeight)
    // Set up mock VAULT to return appropriate weights
    await mockVAULT.setTotalWeight(100);
    await mockVAULT.setMemberWeight(owner.address, 40);
    
    // Vote on proposal 1
    await dao.voteProposal(1);
    
    // Wait for coolOffPeriod (1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Finalise the proposal - in original, this would call moveRewardAddress
    // In mutant, it will incorrectly call moveUtils (changeUTILS)
    await dao.finaliseProposal(1);
    
    // Verify that moveUtils was NOT called (mutant detection)
    // If mutant is present, changeUTILS was called with addr2.address
    // If original, setRewardAddress was called with addr2.address
    const lastCalledFunction = await mockVADER.lastCalledFunction();
    const lastAddressArg = await mockVADER.lastAddressArg();
    
    // For original: lastCalledFunction should be "setRewardAddress"
    // For mutant: lastCalledFunction should be "changeUTILS"
    // We expect the original behavior, so mutant will fail this assertion
    expect(lastCalledFunction).to.equal("setRewardAddress");
    expect(lastAddressArg).to.equal(addr2.address);
  });
});