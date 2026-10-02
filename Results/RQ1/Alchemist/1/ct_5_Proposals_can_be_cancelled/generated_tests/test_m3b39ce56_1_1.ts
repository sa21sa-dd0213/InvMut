import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - hasMinority always returns false", function () {
  it("should revert cancelProposal when hasMinority returns false (mutant kills cancellation)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, VAULT interfaces
    const VaultFactory = await ethers.getContractFactory("VAULT");
    const vault = await VaultFactory.deploy();
    await vault.waitForDeployment();

    const VaderFactory = await ethers.getContractFactory("VADER");
    const vader = await VaderFactory.deploy();
    await vader.waitForDeployment();

    const UsdvFactory = await ethers.getContractFactory("USDV");
    const usdv = await UsdvFactory.deploy();
    await usdv.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Create an address proposal to get a proposal ID
    await dao.connect(addr1).newAddressProposal(addr2.address, "DAO");

    // Vote on the proposal to give it some votes (needs > totalWeight/6 for minority)
    await dao.connect(addr1).voteProposal(1);
    await dao.connect(addr2).voteProposal(1);

    // Now create a second proposal to use as newProposalID in cancelProposal
    await dao.connect(addr1).newAddressProposal(addr2.address, "DAO");

    // Try to finalise first proposal (required for cancelProposal)
    await dao.connect(addr1).voteProposal(1);

    // Wait for coolOffPeriod
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Finalise the first proposal
    await dao.connect(owner).finaliseProposal(1);

    // Now try to cancel proposal 1 using proposal 2
    // This should revert in the mutant because hasMinority(2) will return false
    await expect(
      dao.connect(owner).cancelProposal(1, 2)
    ).to.be.reverted;
  });
});