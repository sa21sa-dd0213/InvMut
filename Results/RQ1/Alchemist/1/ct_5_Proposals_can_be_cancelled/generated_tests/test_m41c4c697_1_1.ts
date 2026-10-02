import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m41c4c697 test", function () {
  it("should revert when moveUtils is called with a non-zero address due to mutated require statement", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();

    const USDVFactory = await ethers.getContractFactory("iERC20");
    const usdv = await USDVFactory.deploy();
    await usdv.waitForDeployment();

    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Create a new address proposal to change UTILS address
    const validAddress = addr1.address;
    await dao.newAddressProposal(validAddress, "UTILS");

    // Vote on the proposal to reach quorum and majority
    // First, set up vault to return some weight
    // We need to simulate vault behavior for voting weight
    // For this test, we'll directly call finaliseProposal after voting

    await dao.voteProposal(1);

    // The mutant changes the require from != to == for address(0) check
    // This means the function will revert when trying to use a valid non-zero address
    // Let's test by trying to finalise the proposal

    // First we need to simulate the finalising state and time
    // Since the original finaliseProposal checks for finalising state and coolOffPeriod,
    // we need to create a proposal that is already in finalising state

    // Create another proposal that will be finalised
    await dao.newAddressProposal(validAddress, "UTILS");
    await dao.voteProposal(2);

    // Advance time to pass coolOffPeriod
    await ethers.provider.send("evm_increaseTime", [2]); // coolOffPeriod is 1
    await ethers.provider.send("evm_mine");

    // Try to finalise the proposal - this should revert in the mutant
    // because the require statement now checks for address(0) instead of != address(0)
    await expect(
      dao.finaliseProposal(2)
    ).to.be.revertedWith("No address proposed");
  });
});