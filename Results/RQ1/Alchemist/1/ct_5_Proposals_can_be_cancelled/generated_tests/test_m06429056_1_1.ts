import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m06429056 - voteProposal condition change", function () {
  it("should not finalise a proposal when vote does not meet quorum", async function () {
    const [owner, member1, member2] = await ethers.getSigners();

    // Deploy mock VADER, USDV, and VAULT contracts
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

    // Create a grant proposal
    await dao.connect(member1).newGrantProposal(member2.address, ethers.parseEther("100"));

    // Mock vault to return low weight for member1 (below quorum)
    // Set totalWeight to 1000, member1 weight to 100 (less than 333 needed for quorum)
    await vault.mockTotalWeight.returns(1000);
    await vault.mockGetMemberWeight.returns(100);

    // Vote on proposal 1
    const tx = await dao.connect(member1).voteProposal(1);
    await tx.wait();

    // Verify that proposal is NOT finalising (quorum not met)
    expect(await dao.mapPID_finalising(1)).to.equal(false);

    // Verify votes are recorded but proposal not marked for finalisation
    expect(await dao.mapPID_votes(1)).to.equal(100);
    expect(await dao.mapPID_finalised(1)).to.equal(false);
  });
});