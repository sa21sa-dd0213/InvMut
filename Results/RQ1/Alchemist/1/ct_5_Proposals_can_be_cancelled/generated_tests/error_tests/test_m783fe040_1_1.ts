import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m783fe040 test", function () {
  it("should detect mutant that sets USDV = address(this) instead of _usdv", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 token to act as USDV
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdv = await MockERC20.deploy("USDV", "USDV", 18);
    await usdv.waitForDeployment();

    // Deploy mock Vault
    const MockVault = await ethers.getContractFactory("MockVault");
    const vault = await MockVault.deploy();
    await vault.waitForDeployment();

    // Deploy mock VADER
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const vader = await MockVADER.deploy();
    await vader.waitForDeployment();

    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO with addresses
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Fund the vault with USDV
    const vaultAddress = await vault.getAddress();
    const mintAmount = ethers.parseEther("1000");
    await usdv.mint(vaultAddress, mintAmount);

    // Set up vault to return total weight for quorum calculations
    await vault.setTotalWeight(ethers.parseEther("100"));

    // Create a grant proposal
    await dao.newGrantProposal(addr1.address, ethers.parseEther("10"));

    // Vote on proposal to get quorum and majority
    await dao.connect(owner).voteProposal(1);

    // Fast forward time past coolOffPeriod
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to finalize the proposal
    // In the mutant, USDV = address(dao) so balanceOf will be called on DAO contract instead of USDV token
    // This should cause a revert because DAO doesn't have the balanceOf function
    await expect(
      dao.connect(owner).finaliseProposal(1)
    ).to.be.reverted;
  });
});