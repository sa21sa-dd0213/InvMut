import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - newGrantProposal event emission", function () {
  it("should emit NewProposal event when calling newGrantProposal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock VADER and VAULT contracts (minimal interfaces for testing)
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const vaderMock = await VADERFactory.deploy();
    await vaderMock.waitForDeployment();
    
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    const vaultMock = await VAULTFactory.deploy();
    await vaultMock.waitForDeployment();
    
    // Deploy mock USDV token
    const USDVFactory = await ethers.getContractFactory("iERC20");
    const usdvMock = await USDVFactory.deploy();
    await usdvMock.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vaderMock.getAddress(), await usdvMock.getAddress(), await vaultMock.getAddress());
    
    // Call newGrantProposal and expect NewProposal event
    const recipient = addr1.address;
    const amount = ethers.parseEther("100");
    
    await expect(dao.newGrantProposal(recipient, amount))
      .to.emit(dao, "NewProposal")
      .withArgs(owner.address, 1, "GRANT");
  });
});