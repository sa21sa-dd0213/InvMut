import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m86a95378 - USDV set to address(0)", function () {
  it("should kill mutant by detecting that grantFunds fails when USDV is address(0)", async function () {
    const [owner, addr1, addr2, vault, vader, usdv] = await ethers.getSigners();

    // Deploy the DAO contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Deploy mock VADER token for initialization
    const VaderFactory = await ethers.getContractFactory("iVADER");
    const vaderMock = await VaderFactory.deploy();
    await vaderMock.waitForDeployment();

    // Deploy mock USDV token
    const UsdvFactory = await ethers.getContractFactory("iERC20");
    const usdvMock = await UsdvFactory.deploy();
    await usdvMock.waitForDeployment();

    // Deploy mock VAULT
    const VaultFactory = await ethers.getContractFactory("iVAULT");
    const vaultMock = await VaultFactory.deploy();
    await vaultMock.waitForDeployment();

    // Initialize the DAO
    await dao.init(await vaderMock.getAddress(), await usdvMock.getAddress(), await vaultMock.getAddress());

    // Setup: Give vault some USDV balance
    const VAULT_ADDRESS = await vaultMock.getAddress();
    const grantAmount = ethers.parseEther("100");
    await usdvMock.transfer(VAULT_ADDRESS, grantAmount * 10n); // Vault has 1000 USDV

    // Make vault return totalWeight > 0 for quorum checks
    await vaultMock.setTotalWeight(ethers.parseEther("1000"));

    // Create a grant proposal
    await dao.newGrantProposal(addr2.address, grantAmount);

    // Vote on the proposal to meet quorum and majority
    await dao.connect(addr1).voteProposal(1);
    await dao.connect(owner).voteProposal(1);

    // Wait for coolOffPeriod (1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    // Try to finalise - should revert on mutant because USDV is address(0)
    // On original, it should succeed because USDV is correctly set
    await expect(dao.finaliseProposal(1)).to.be.reverted;

    // Additional verification: check that USDV is indeed address(0) in mutant
    // This confirms the mutant behavior
    // We can't directly check private state, but the revert proves it
  });
});