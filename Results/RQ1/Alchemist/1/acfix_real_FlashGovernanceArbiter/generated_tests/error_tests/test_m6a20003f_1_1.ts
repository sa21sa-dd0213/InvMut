import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m6a20003f test", function () {
  it("should detect mutant that changes <= to < for v2 == 1 when v1 == 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns a mock FlashGovernanceArbiter
    const DAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await dao.getAddress());
    await instance.waitForDeployment();
    
    // Configure the DAO to return true for successfulProposal
    await dao.setSuccessfulProposal(owner.address, true);
    
    // Set enforcement to true for addr1 and make addr1 configured
    await instance.setEnforcement(true);
    
    // Deploy a mock configurable contract that returns configured() = true
    const ConfigurableFactory = await ethers.getContractFactory("MockConfigurable");
    const configurable = await ConfigurableFactory.deploy();
    await configurable.waitForDeployment();
    await configurable.setConfigured(true);
    
    // Set the security changeTolerance to a value that would make the check pass
    // We need to configure security parameters via a successful proposal
    // First, call configureSecurityParameters through the owner who is a successful proposer
    await instance.connect(owner).configureSecurityParameters(50, 86400, 50);
    
    // Now test the boundary condition: v1 = 0, v2 = 1
    // This should pass on original (<=) but fail on mutant (<)
    await expect(
      instance.connect(addr1).enforceTolerance(0, 1)
    ).to.be.revertedWith("FE1");
  });
});