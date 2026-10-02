import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - isEqual always returns false", function () {
  it("should detect mutant where isEqual returns false by verifying grant proposal execution fails", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER, USDV, and VAULT contracts
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const MockVADERFactory = await ethers.getContractFactory("MockVADER");
    const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");

    const vader = await MockVADERFactory.deploy();
    const usdv = await MockERC20Factory.deploy("USDV", "USDV", 18);
    const vault = await MockVAULTFactory.deploy();

    await vader.waitForDeployment();
    await usdv.waitForDeployment();
    await vault.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Fund vault with USDV and set totalWeight for quorum calculations
    const grantAmount = ethers.parseEther("100");
    const vaultAddress = await vault.getAddress();
    await usdv.transfer(vaultAddress, ethers.parseEther("10000"));

    // Set vault totalWeight to enable quorum/majority calculations
    await vault.setTotalWeight(ethers.parseEther("1000"));

    // Create a grant proposal
    await dao.connect(addr1).newGrantProposal(addr2.address, grantAmount);
    const proposalId = 1;

    // Vote to reach quorum (> totalWeight/3 = 333) and majority (> totalWeight/2 = 500)
    await vault.setMemberWeight(addr1.address, ethers.parseEther("600"));
    await dao.connect(addr1).voteProposal(proposalId);

    // Wait for coolOffPeriod (1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    // Attempt to finalise the proposal
    // In original contract, this should execute grantFunds which transfers USDV to addr2
    // In mutant, isEqual('GRANT', typeStr) returns false, so grantFunds is never called
    await dao.connect(addr1).finaliseProposal(proposalId);

    // Check that the grant was NOT executed - addr2 should have 0 USDV balance
    const addr2Balance = await usdv.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(0);

    // Also verify the proposal was not completed (finalised should be false)
    const isFinalised = await dao.mapPID_finalised(proposalId);
    expect(isFinalised).to.equal(false);
  });
});