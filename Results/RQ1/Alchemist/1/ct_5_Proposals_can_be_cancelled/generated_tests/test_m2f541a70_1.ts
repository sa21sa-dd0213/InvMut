import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant detection - init re-initialization", function () {
  it("should revert when init is called twice (detects m2f541a70)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy DAO (no constructor arguments needed as per original contract)
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy mock contracts for VADER, USDV, VAULT addresses
    // Since init requires addresses, we deploy simple ERC20-like mocks
    const MockFactory = await ethers.getContractFactory("MockERC20");
    const vader = await MockFactory.deploy();
    await vader.waitForDeployment();
    const usdv = await MockFactory.deploy();
    await usdv.waitForDeployment();
    const vault = await MockFactory.deploy();
    await vault.waitForDeployment();
    
    // First init call should succeed
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Second init call should revert because inited is already true
    // In the original contract: require(inited == false) will fail
    // In the mutant: require(inited >= false) will always pass, allowing re-initialization
    await expect(
      dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress())
    ).to.be.reverted;
  });
});