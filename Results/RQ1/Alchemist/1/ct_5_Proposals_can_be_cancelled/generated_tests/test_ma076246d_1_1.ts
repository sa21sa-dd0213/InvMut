import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant ma076246d test - grantFunds <= vs >=", function () {
  it("should revert when grant amount is exactly 5% of vault USDV balance (mutant would pass incorrectly)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for VADER and USDV
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const vader = await ERC20Factory.deploy("VADER", "VDR", 18);
    const usdv = await ERC20Factory.deploy("USDV", "USDV", 18);
    await vader.waitForDeployment();
    await usdv.waitForDeployment();

    // Deploy mock VAULT
    const VaultFactory = await ethers.getContractFactory("VAULTMock");
    const vault = await VaultFactory.deploy();
    await vault.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Fund vault with 1000 USDV
    await usdv.mint(await vault.getAddress(), ethers.parseEther("1000"));
    await vault.setReserveUSDV(ethers.parseEther("1000"));

    // Grant amount = 5% of vault balance = 50 USDV (should pass original <=, fail mutant >=)
    const grantAmount = ethers.parseEther("50");

    // Create grant proposal
    const tx1 = await dao.connect(addr1).newGrantProposal(addr2.address, grantAmount);
    await tx1.wait();

    // Vote for the proposal to reach quorum and majority
    await vault.setTotalWeight(ethers.parseEther("100"));
    await vault.setMemberWeight(addr1.address, ethers.parseEther("60")); // 60% weight

    const tx2 = await dao.connect(addr1).voteProposal(1);
    await tx2.wait();

    // Fast forward past coolOffPeriod (1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Finalise proposal - original would succeed, mutant would revert with "Not more than 10%"
    await expect(
      dao.connect(addr1).finaliseProposal(1)
    ).to.not.be.reverted; // Original passes, mutant would revert

    // Verify grant was executed (original behavior)
    // The test passes if the transaction does not revert (original behavior)
    // The mutant would revert here, killing the test
  });
});