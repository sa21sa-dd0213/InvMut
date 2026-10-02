import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - m208ba58b", function () {
  it("should detect that VADER is set to address(0) instead of the provided address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const MockVADERFactory = await ethers.getContractFactory("MockVADER");
    const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");

    const mockVADER = await MockVADERFactory.deploy();
    await mockVADER.waitForDeployment();

    const mockUSDV = await MockERC20Factory.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    const mockVAULT = await MockVAULTFactory.deploy();
    await mockVAULT.waitForDeployment();

    // Deploy DAO contract
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO with the mock contracts
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Create a UTILS type proposal
    const newUtilsAddress = addr1.address;
    await dao.newAddressProposal(newUtilsAddress, "UTILS");

    // Vote on proposal 1 (should have quorum and majority since only owner votes)
    await dao.voteProposal(1);

    // Fast forward past coolOffPeriod (coolOffPeriod = 1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Try to finalise the proposal - this should fail if VADER is address(0)
    // because moveUtils() calls iVADER(VADER).changeUTILS() which will revert
    await expect(dao.finaliseProposal(1)).to.be.reverted;
  });
});