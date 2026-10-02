import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO - kill mutant m5ac40026 (event emission removed)", function () {
  it("should emit FinalisedProposal event when completing a proposal", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER, USDV, and VAULT contracts (simplified for testing)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const MockVAULT = await ethers.getContractFactory("MockVAULT");

    const usdv = await MockERC20.deploy("USDV", "USDV", 18);
    await usdv.waitForDeployment();

    const vader = await MockVADER.deploy();
    await vader.waitForDeployment();

    const vault = await MockVAULT.deploy();
    await vault.waitForDeployment();

    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Create a grant proposal (simplest to test event emission)
    const grantAmount = ethers.parseEther("100");
    await dao.connect(addr1).newGrantProposal(addr2.address, grantAmount);

    // Get proposal ID (first proposal)
    const proposalID = 1;

    // Set up vault mock to return proper values for voting
    // We need totalWeight and getMemberWeight to return non-zero values
    // This requires the MockVAULT to have these functions implemented
    
    // For this test, we'll simulate by directly setting the vault state
    // to ensure hasQuorum passes and the proposal can be finalised
    
    // Vote on the proposal to increase vote count
    await dao.connect(addr1).voteProposal(proposalID);

    // Wait for coolOff period (1 second as set in init)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Now finalise the proposal - this should emit FinalisedProposal
    const tx = await dao.connect(addr1).finaliseProposal(proposalID);
    const receipt = await tx.wait();

    // Check that FinalisedProposal event was emitted
    const event = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("FinalisedProposal(address,uint256,uint256,uint256,string)")
    );

    expect(event).to.not.be.undefined;
  });
});