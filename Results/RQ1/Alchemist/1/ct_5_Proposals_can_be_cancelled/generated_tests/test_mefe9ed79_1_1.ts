import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - isEqual always returns false", function () {
  it("should detect mutant by verifying grant proposal cannot be finalized when isEqual always returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER contract
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();

    // Deploy mock VAULT contract
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();

    // Deploy mock USDV (ERC20) contract
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockERC20.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    // Deploy DAO contract
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO with required addresses
    await dao.init(
      await mockVADER.getAddress(),
      await mockUSDV.getAddress(),
      await mockVAULT.getAddress()
    );

    // Setup mock VAULT to return a total weight so hasQuorum can be satisfied
    // Set totalWeight to 1000
    await mockVAULT.setTotalWeight(1000);

    // Create a grant proposal
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

    // Get proposal ID (should be 1)
    const proposalID = 1;

    // Vote on the proposal to reach quorum (> totalWeight/3 = >333)
    // Set voter weight to 400 to exceed quorum
    await mockVAULT.setMemberWeight(owner.address, 400);
    await dao.voteProposal(proposalID);

    // Set member weight for another voter to reach majority
    await mockVAULT.setMemberWeight(addr2.address, 200);

    // Have addr2 vote to reach majority (> totalWeight/2 = >500)
    await dao.connect(addr2).voteProposal(proposalID);

    // Now the proposal should be finalising (hasQuorum and hasMajority satisfied)
    // Check that mapPID_finalising is true
    expect(await dao.mapPID_finalising(proposalID)).to.be.true;

    // Set timeStart for the proposal (simulate block.timestamp)
    // We need to mine blocks to pass coolOffPeriod (1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Now try to finalise the proposal
    // In the original contract, this should work and call grantFunds
    // In the mutant, isEqual will return false for "GRANT" comparison,
    // so the grantFunds function will never be called

    // Setup mock VAULT to have enough USDV balance (10% of vault balance)
    await mockUSDV.mint(await mockVAULT.getAddress(), ethers.parseEther("10000"));

    // Setup mock VAULT grant function to track if called
    let grantCalled = false;
    await mockVAULT.setGrantCallback(() => { grantCalled = true; });

    // Attempt to finalise the proposal
    const tx = await dao.finaliseProposal(proposalID);
    await tx.wait();

    // In the original contract, grantFunds would have been called
    // In the mutant, isEqual returns false, so grantFunds is never called
    // The proposal should remain in finalising state
    expect(await dao.mapPID_finalised(proposalID)).to.be.false;
    expect(await dao.mapPID_finalising(proposalID)).to.be.true;

    // If grant was called, mapPID_votes would be 0 (set in completeProposal)
    // In mutant, votes should not be reset
    expect(await dao.mapPID_votes(proposalID)).to.not.equal(0);
  });
});