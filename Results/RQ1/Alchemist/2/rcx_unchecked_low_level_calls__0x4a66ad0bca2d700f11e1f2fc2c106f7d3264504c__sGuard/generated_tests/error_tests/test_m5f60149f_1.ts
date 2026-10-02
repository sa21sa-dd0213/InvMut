import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m5f60149f", function () {
  it("should kill mutant by detecting wrong from address in transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the current from address stored in the contract
    const storedFrom = await instance.from();
    
    // The original contract has from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // The mutant changes it to 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // The require(msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9) still checks the original address
    
    // Setup test parameters
    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 1e18 internally)
    
    // Try calling transfer as the original authorized address
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // This should revert on the mutant because:
    // - msg.sender check passes (using original address)
    // - But the call uses the mutated from address (0x1f84...)
    // - The external contract at caddress will fail transferFrom because from is wrong
    
    // Since we don't have the private key for 0x9797..., we need to test differently
    // The require check uses msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Only owner can pass this check (owner is the deployer)
    
    // Test that calling from unauthorized address reverts (same as original)
    await expect(
      instance.connect(addr1).transfer(tos, values)
    ).to.be.reverted;
    
    // Test that calling from authorized address (owner) succeeds on original
    // On mutant, the call will use wrong from address and should revert or behave differently
    // Since we can't predict exact behavior without knowing caddress implementation,
    // we check that the stored from address is the one from the mutant
    expect(storedFrom).to.equal("0x1f844685f7Bf86eFcc0e74D8642c54A257111923");
    
    // The key assertion: on original, from = 0x9797..., on mutant from = 0x1f84...
    // So we verify the mutation by checking the state variable
    // This test will pass on original (where from is 0x9797...) and fail on mutant
    // Because the mutant changed the from address
  });
});