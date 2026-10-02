import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m0bc5bc04 test", function () {
  it("should fail when trying to finalize a grant proposal because VAULT is set to DAO itself", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock ERC20 for USDV
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdv = await MockERC20.deploy("USDV", "USDV", 18);
    await usdv.waitForDeployment();
    
    // Deploy mock VADER
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const vader = await MockVADER.deploy();
    await vader.waitForDeployment();
    
    // Deploy mock VAULT
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const vault = await MockVAULT.deploy();
    await vault.waitForDeployment();
    
    // Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO with VADER, USDV, and vault addresses
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Mint some USDV to the vault for the grant
    await usdv.mint(await vault.getAddress(), ethers.parseEther("1000"));
    
    // Create a grant proposal
    await dao.connect(addr1).newGrantProposal(addr2.address, ethers.parseEther("10"));
    
    // Vote on the proposal to get it to finalising state
    await dao.connect(addr1).voteProposal(1);
    
    // Wait for coolOffPeriod (1 second) to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to finalise the proposal - this should revert on the mutant because VAULT = address(this)
    // The DAO contract doesn't implement the grant function from iVAULT interface
    await expect(
      dao.connect(addr1).finaliseProposal(1)
    ).to.be.reverted;
  });
});