import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m9ba771a8 - boundary condition test", function () {
  it("should revert when grant amount is exactly 10% of vault USDV balance (mutant should revert, original should pass)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock tokens and vault first
    const ERC20Factory = await ethers.getContractFactory("iERC20");
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const VAULTFactory = await ethers.getContractFactory("iVAULT");

    const vader = await ERC20Factory.deploy();
    const usdv = await ERC20Factory.deploy();
    const vault = await VAULTFactory.deploy();
    const vaderInterface = await VADERFactory.deploy();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vaderInterface.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Setup: Give vault some USDV balance
    const vaultAddress = await vault.getAddress();
    const vaultUSDVAmount = ethers.parseEther("1000"); // 1000 USDV in vault
    await usdv.transfer(vaultAddress, vaultUSDVAmount);

    // Grant amount exactly 10% of vault's USDV balance
    const grantAmount = vaultUSDVAmount / 10n; // exactly 100 USDV (10% of 1000)

    // Create grant proposal
    await dao.newGrantProposal(addr1.address, grantAmount);

    // Get proposal ID (should be 1)
    const proposalID = 1;

    // Need to vote to finalise the proposal first
    await dao.connect(addr1).voteProposal(proposalID);

    // Simulate time passing beyond coolOffPeriod
    await ethers.provider.send("evm_increaseTime", [2]); // coolOffPeriod is 1
    await ethers.provider.send("evm_mine");

    // In the original contract, exactly 10% should pass (<=)
    // In the mutant, exactly 10% should revert (<)
    // We expect this to revert in the mutant, so we test for revert
    await expect(
      dao.finaliseProposal(proposalID)
    ).to.be.revertedWith("Not more than 10%");
  });
});