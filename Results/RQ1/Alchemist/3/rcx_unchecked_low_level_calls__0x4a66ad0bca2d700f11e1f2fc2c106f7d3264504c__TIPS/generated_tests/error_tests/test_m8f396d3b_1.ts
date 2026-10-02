import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m8f396d3b", function () {
  it("should detect that from address is mutated to wrong address", async function () {
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get signers
    const [owner, addr1] = await ethers.getSigners();
    
    // The authorized sender address from the original contract
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });

    // Get the contract's caddress (the external contract to call)
    const caddress = await instance.caddress();
    
    // Deploy a simple mock contract at caddress that tracks transferFrom calls
    const MockTransferFrom = await ethers.getContractFactory("MockTransferFrom");
    const mockContract = await MockTransferFrom.deploy();
    await mockContract.waitForDeployment();
    
    // Replace the caddress in the EBU contract with our mock
    // Note: We need to set the caddress variable directly since there's no setter
    // This requires the contract to be deployed with the correct address or we use storage manipulation
    // For testing purposes, we'll deploy a new EBU with the mock address
    
    // Actually, let's test by checking the from address directly
    const fromAddress = await instance.from();
    
    // The mutant changes from to 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // The original has from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We can verify this directly
    
    const expectedOriginalFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const expectedMutantFrom = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";
    
    // If the from address equals the mutant value, the test should fail
    // because the mutant changes the from address
    expect(fromAddress.toLowerCase()).to.equal(expectedOriginalFrom.toLowerCase());
    
    // Now test the transfer function behavior
    // Create arrays for transfer
    const tos = [addr1.address];
    const amounts = [1]; // 1 token
    
    // Call transfer from authorized address
    // In the mutant, from is changed to caddress, so transferFrom will try to transfer from caddress
    // This should fail because caddress doesn't have tokens or approval
    
    // We expect the transaction to revert in the mutant because:
    // Original: transferFrom(authorizedAddress, to, amount) - works if authorizedAddress has tokens
    // Mutant: transferFrom(caddress, to, amount) - fails because caddress doesn't have tokens
    
    await expect(
      instance.connect(authorizedSigner).transfer(tos, amounts)
    ).to.be.reverted;
  });
});

// Helper contract to be deployed separately for testing
// Note: This contract should be compiled and deployed alongside the test
contract MockTransferFrom {
    function transferFrom(address from, address to, uint256 amount) external pure returns (bool) {
        // Simply returns true to simulate successful transfer
        return true;
    }
}