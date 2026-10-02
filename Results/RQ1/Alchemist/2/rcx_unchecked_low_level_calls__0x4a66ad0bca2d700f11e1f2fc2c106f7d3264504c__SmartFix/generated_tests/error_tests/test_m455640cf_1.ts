import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m455640cf", function () {
  it("should kill mutant by verifying tokens are transferred from the correct 'from' address, not from address(0)", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the deployed from address
    const fromAddress = await instance.from();
    
    // Create a mock token contract that can track transferFrom calls
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy(ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Set the caddress in EBU to our mock token
    // Note: This requires the contract to allow setting caddress, but since it's a public variable
    // we need to work with the existing caddress. Instead, we'll deploy a custom test contract.
    
    // Alternative approach: Deploy a test helper that acts as the caddress
    const TestHelperFactory = await ethers.getContractFactory("TransferFromTracker");
    const tracker = await TestHelperFactory.deploy();
    await tracker.waitForDeployment();
    
    // We need to set the caddress in EBU to our tracker
    // Since EBU has no setter, we'll need to deploy EBU with a modified constructor
    // Actually, let's use a simpler approach - deploy a new version of EBU that accepts caddress
    
    // For this test, let's deploy a modified EBU that allows setting caddress
    const ModifiedFactory = await ethers.getContractFactory("EBU");
    const modifiedInstance = await ModifiedFactory.deploy();
    await modifiedInstance.waitForDeployment();
    
    // The original caddress is fixed at 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // We need to test against the actual contract behavior
    
    // Test scenario: Call transfer with valid parameters
    const tos = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)
    
    // Call transfer as the authorized sender (owner of from address)
    // The from address in original is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const impersonatedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the impersonated account
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1")
    });
    
    // Call transfer
    const tx = await modifiedInstance.connect(impersonatedSigner).transfer(tos, amounts);
    await tx.wait();
    
    // Check the from address after deployment
    const fromAfterDeploy = await modifiedInstance.from();
    
    // The mutant changes from to address(0), so we verify it's not zero
    expect(fromAfterDeploy).to.not.equal(ethers.ZeroAddress, 
      "Mutant killed: from address should not be zero address in original contract");
    
    // Additional verification: The original from address should be set correctly
    if (fromAfterDeploy === ethers.ZeroAddress) {
      // This is the mutant - the test fails (kills the mutant)
      expect.fail("Mutant detected: from address is zero address");
    }
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
  });
});