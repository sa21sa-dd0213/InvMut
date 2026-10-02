import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mfd526744", function () {
  it("should kill the mutant by verifying that caddress is the contract itself instead of the hardcoded address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // Call the caddress getter to see what it returns
    const caddressValue = await instance.caddress();
    
    // In the original contract, caddress should be 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // In the mutant, caddress should be address(this) which is the contract's own address
    // We can distinguish by checking if caddress equals the contract's own address
    // If it does, the mutant is detected (the original should NOT have caddress == contract address)
    expect(caddressValue).to.equal(contractAddress);
  });
});