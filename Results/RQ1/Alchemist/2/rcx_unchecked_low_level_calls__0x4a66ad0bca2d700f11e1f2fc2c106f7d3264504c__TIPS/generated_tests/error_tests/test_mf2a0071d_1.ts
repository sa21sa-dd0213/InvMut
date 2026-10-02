import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mf2a0071d - caddress changed to from address", function () {
  it("should detect mutant by verifying token transfer fails when caddress is incorrect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the addresses from the contract
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();
    
    // Verify the mutant condition: caddress should equal fromAddress in mutant
    // In original, caddress is different (0x1f844685f7Bf86eFcc0e74D8642c54A257111923)
    // In mutant, caddress is same as fromAddress (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    expect(caddress).to.equal(fromAddress);
    
    // Prepare test data for transfer call
    const tos = [addr1.address];
    const amounts = [ethers.parseEther("1")]; // 1 token
    
    // The transfer function will call caddress.call with transferFrom selector
    // In mutant, caddress is the from address which is an EOA, not a contract
    // This call should revert because EOAs cannot execute contract calls
    await expect(
      instance.connect(owner).transfer(tos, amounts)
    ).to.be.reverted;
  });
});