import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mbca5a7d3 - cancelProposal with == instead of !=", function () {
  it("should revert when calling cancelProposal with different proposal IDs on original, but pass on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy mock VADER, USDV, VAULT for initialization
    // Using simple ERC20 mock for USDV and VADER
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const vader = await ERC20Factory.deploy("VADER", "VDR", 18);
    const usdv = await ERC20Factory.deploy("USDV", "USDV", 18);
    await vader.waitForDeployment();
    await usdv.waitForDeployment();
    
    // Deploy mock VAULT
    const VaultFactory = await ethers.getContractFactory("contracts/mocks/VaultMock.sol:VaultMock");
    const vault = await VaultFactory.deploy();
    await vault.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Create two proposals
    await dao.newAddressProposal(addr1.address, "UTILS");
    await dao.newAddressProposal(addr2.address, "UTILS");
    
    // Vote on both proposals to make them finalising
    await dao.voteProposal(1);
    await dao.voteProposal(2);
    
    // Now try to cancel proposal 1 with proposal 2 (different IDs)
    // On original: should pass because 1 != 2
    // On mutant: should revert because 1 == 2 is false
    await expect(
      dao.cancelProposal(1, 2)
    ).to.be.revertedWith("New proposal ID must be different from old proposal ID");
  });
});