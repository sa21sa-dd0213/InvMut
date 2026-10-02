import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - mutant m8d3a1b52", function () {
  it("should detect mutant by calling assertGovernanceApproved with emergency=true when epoch time condition fails", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock DAO contract that returns required values
    const MockDAOfactory = await ethers.getContractFactory("contracts/mocks/MockLimboDAO.sol:MockLimboDAO");
    const mockDAO = await MockDAOfactory.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Deploy a mock ERC20 token for the flash governance asset
    const MockERC20Factory = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const mockToken = await MockERC20Factory.deploy("Test", "TST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    // Set up the DAO to return a successful proposal for the owner
    await mockDAO.setSuccessfulProposal(owner.address, true);
    
    // Configure flash governance with a small amount and short unlock time
    await instance.connect(owner).configureFlashGovernance(
      await mockToken.getAddress(),
      ethers.parseEther("100"),
      3600, // 1 hour unlock time
      false
    );
    
    // Configure security parameters with a large epoch size (e.g., 1 day)
    await instance.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      86400, // epochSize = 1 day
      50 // changeTolerance
    );
    
    // Configure the mock DAO to return the instance as the flash governor
    await mockDAO.setFlashGoverner(await instance.getAddress());
    
    // Set the instance as governed for addr1
    await instance.connect(owner).setGoverned([addr1.address], [true]);
    
    // Transfer tokens to addr1 for the flash governance deposit
    await mockToken.transfer(addr1.address, ethers.parseEther("1000"));
    await mockToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // First flash governance action to set lastFlashGovernanceAct
    await instance.connect(addr1).assertGovernanceApproved(addr1.address, addr2.address, false);
    
    // Now attempt emergency flash governance immediately (within the same epoch)
    // The original contract should pass because emergency=true bypasses epoch check
    // The mutant should revert because it requires both emergency AND epoch time to have passed
    await expect(
      instance.connect(addr1).assertGovernanceApproved(addr1.address, addr2.address, true)
    ).to.be.revertedWith("LIMBO: flash governance disabled for rest of epoch");
  });
});