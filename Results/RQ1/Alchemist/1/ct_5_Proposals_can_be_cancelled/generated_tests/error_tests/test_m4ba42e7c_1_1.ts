import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m4ba42e7c - voteProposal quorum check", function () {
  it("should kill mutant by showing proposals never reach finalising state via voting", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy VADER mock
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const vaderMock = await VADERFactory.deploy();
    await vaderMock.waitForDeployment();

    // Deploy VAULT mock
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    const vaultMock = await VAULTFactory.deploy();
    await vaultMock.waitForDeployment();

    // Deploy USDV mock
    const USDVFactory = await ethers.getContractFactory("iERC20");
    const usdvMock = await USDVFactory.deploy();
    await usdvMock.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vaderMock.getAddress(), await usdvMock.getAddress(), await vaultMock.getAddress());

    // Setup vault mock to return sufficient totalWeight for quorum/majority
    // totalWeight = 1000, so quorum > 333, majority > 500, minority > 166
    await vaultMock.setTotalWeight(1000);

    // Set member weight for addr1 to be enough for quorum and majority
    await vaultMock.setMemberWeight(addr1.address, 600);

    // Create a new grant proposal (any proposal type works)
    await dao.connect(addr1).newGrantProposal(addr2.address, ethers.parseEther("100"));

    // Verify proposal 1 exists and is not finalising
    expect(await dao.mapPID_finalising(1)).to.equal(false);

    // Vote on proposal 1 - this should trigger _finalise if condition is met
    await dao.connect(addr1).voteProposal(1);

    // In the original contract, this should set mapPID_finalising[1] to true
    // In the mutant (if(false)), it will remain false
    // Therefore, asserting it becomes true will kill the mutant
    expect(await dao.mapPID_finalising(1)).to.equal(true);
  });
});