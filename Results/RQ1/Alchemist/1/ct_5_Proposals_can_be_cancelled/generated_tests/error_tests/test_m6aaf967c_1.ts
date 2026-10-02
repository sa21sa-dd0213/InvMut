import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m6aaf967c - newAddressProposal event emission", function () {
  it("should emit NewProposal event when newAddressProposal is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DAO contract (no constructor arguments needed)
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize the contract with mock addresses
    const mockVader = ethers.ZeroAddress;
    const mockUsdv = ethers.ZeroAddress;
    const mockVault = ethers.ZeroAddress;
    await dao.init(mockVader, mockUsdv, mockVault);
    
    // Prepare test parameters
    const proposedAddress = addr1.address;
    const proposalType = "DAO";
    
    // Call newAddressProposal and expect NewProposal event
    await expect(dao.newAddressProposal(proposedAddress, proposalType))
      .to.emit(dao, "NewProposal")
      .withArgs(owner.address, 1, proposalType); // First proposal should have ID 1
  });
});