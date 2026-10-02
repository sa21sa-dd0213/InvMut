import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m05a0a227 test", function () {
  it("should revert when assertGovernanceApproved is called from unauthorized address (non-DAO, non-governed)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy FlashGovernanceArbiter with a mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // addr1 is not the DAO (owner) and not a governed address
    // Calling assertGovernanceApproved from addr1 should revert due to flashEnabled modifier
    // In the original contract, this would revert because addr1 is not authorized
    // In the mutant (without flashEnabled modifier), this would not revert
    
    await expect(
      instance.connect(addr1).assertGovernanceApproved(
        addr1.address,  // sender
        addr2.address,  // target
        false           // emergency
      )
    ).to.be.revertedWith("LIMBO: EP");
  });
});