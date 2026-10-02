import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mfd526744 test", function () {
  it("should detect mutant by verifying external call target", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the EBU contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the hardcoded address from the original contract
    const originalCaddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";
    
    // Deploy a mock contract at the hardcoded address to track calls
    // We need to simulate the contract that would exist at that address
    const MockFactory = await ethers.getContractFactory("MockExternal");
    const mockContract = await MockFactory.deploy();
    await mockContract.waitForDeployment();
    
    // In a real test environment, we would need to deploy the mock at the specific address
    // For this test, we check if the call goes to address(this) instead of the hardcoded address
    
    // Prepare test data
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token
    
    // Get the current address of the contract
    const contractAddress = await instance.getAddress();
    
    // Call transfer and check that the external call target is correct
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    const receipt = await tx.wait();
    
    // The mutant would make a call to address(this) instead of the hardcoded address
    // We can detect this by checking if any events were emitted from the contract itself
    // or by checking that the call data was sent to the wrong address
    
    // Since we can't easily intercept internal calls, we check the state
    // The mutant changes caddress to address(this), so calling transfer would
    // attempt to call transferFrom on itself, which doesn't exist in EBU
    
    // If the mutant is live, this call would revert because EBU doesn't have transferFrom
    // If original, it would call the external contract (which may or may not exist)
    
    // Actually, the original would also revert if the external contract doesn't exist
    // So we need a different approach
    
    // Better approach: Check that caddress equals the original hardcoded address
    const caddress = await instance.caddress();
    
    // In the original, caddress should be 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // In the mutant, caddress should be address(this)
    expect(caddress).to.equal(originalCaddress,
      "Mutant detected: caddress should be the hardcoded external address, not address(this)");
  });
});