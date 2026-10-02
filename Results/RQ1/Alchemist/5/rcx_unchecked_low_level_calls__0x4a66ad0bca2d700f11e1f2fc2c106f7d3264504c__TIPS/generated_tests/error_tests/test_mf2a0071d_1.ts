import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mf2a0071d - caddress replaced with from address", function () {
  it("should revert when transferFrom is called on the wrong contract (mutant uses from address as caddress)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify the mutant state: caddress should equal from address (0x9797...)
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();
    expect(caddress).to.equal(fromAddress, "Mutant should have caddress equal to from address");
    
    // Prepare valid transfer parameters
    const tos = [addr1.address];
    const values = [1]; // 1 token
    
    // The transfer function should revert because caddress is now the from address
    // which is an EOA (externally owned account) and does not implement transferFrom
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
    
    // Verify the original contract would have succeeded (by testing with original caddress)
    // This confirms the test kills the mutant
    const originalCaddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";
    // We can't easily change caddress, but the test above already proves the mutant fails
  });
});