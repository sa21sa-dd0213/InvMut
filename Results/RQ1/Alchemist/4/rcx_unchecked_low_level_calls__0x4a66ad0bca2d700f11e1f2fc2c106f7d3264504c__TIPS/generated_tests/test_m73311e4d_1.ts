import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m73311e4d", function () {
  it("should kill mutant that replaces caddress with address(this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy original contract - no constructor arguments needed for EBU
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the deployed contract address
    const contractAddress = await instance.getAddress();
    
    // Verify the original caddress is the expected external address
    const originalCaddress = await instance.caddress();
    expect(originalCaddress).to.equal("0x1f844685f7Bf86eFcc0e74D8642c54A257111923");
    
    // Verify that calling transfer with the owner as msg.sender succeeds
    // The external contract at caddress must exist and accept the call
    // For the mutant, caddress = address(this), which has no transferFrom function
    // This will cause a revert in the mutant because the call to self fails
    
    // Prepare test parameters
    const recipients = [addr1.address, addr2.address];
    const amounts = [1, 2]; // in whole tokens
    
    // The transfer function will attempt to call transferFrom on caddress
    // Original: calls external contract at 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // Mutant: calls itself (address(this)) which has no transferFrom implementation
    
    // Since we cannot control the external contract, we expect both to revert
    // But the key difference is that the original tries an external call while mutant calls self
    
    // Test that the function call with owner as msg.sender
    await expect(
      instance.connect(owner).transfer(recipients, amounts)
    ).to.be.reverted;
    
    // The above test will pass for both original and mutant
    // To specifically kill the mutant, we need a scenario where the original would succeed
    
    // Alternative approach: deploy a mock external contract at the expected address
    // But since we cannot change addresses, we verify the mutant's self-call behavior
    
    // Kill the mutant by proving caddress is NOT address(this) in the original
    // The mutant sets caddress = address(this), so we check this directly
    expect(originalCaddress).to.not.equal(contractAddress);
    
    // Additional verification: the transfer function in the original calls external address
    // In the mutant, it calls itself, which would always revert since EBU has no transferFrom
    // A successful call on original would require the external contract to exist
    // Since we can't guarantee that, we check the state variable directly
    
    // This test kills the mutant because:
    // - Original: caddress = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // - Mutant: caddress = address(this) (the deployed contract address)
    // - The assertion expect(originalCaddress).to.not.equal(contractAddress) passes for original
    // - But fails for mutant because mutant sets caddress = address(this)
  });
});