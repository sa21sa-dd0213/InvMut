import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - caddress state variable", function () {
  it("should detect mutant that replaces caddress with address(this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the deployed contract address
    const contractAddress = await instance.getAddress();
    
    // Get the caddress value from the contract
    const caddress = await instance.caddress();
    
    // In the original contract, caddress should be 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // In the mutant, caddress equals address(this) which is the contract's own address
    const originalAddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";
    
    // Assert that caddress is NOT equal to the contract's own address
    // If it equals contract address, the mutant is detected
    expect(caddress).to.not.equal(contractAddress);
    
    // Also verify it matches the original hardcoded address
    expect(caddress).to.equal(originalAddress);
    
    // Additional test: call transfer and verify behavior differs
    // Prepare test data
    const tos = [addr1.address];
    const values = [1]; // 1 token
    
    // The original contract would call transferFrom on the external address
    // The mutant would call transferFrom on itself
    // This should revert in the mutant since the contract doesn't have transferFrom
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.not.be.reverted;
  });
});