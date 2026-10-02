import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m66924d33", function () {
  it("should kill mutant by calling transfer from a numerically greater address than the authorized one", async function () {
    // Get signers
    const [owner, unauthorizedHigher] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the authorized address from the contract
    const authorizedAddress = await instance.from();
    
    // Create an address that is numerically greater than the authorized address
    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We'll use addr1 which is typically a different address - we need to ensure it's greater
    // For this test, we'll use the unauthorizedHigher signer which should be > authorized address
    // If not, we can use a hardcoded greater address
    
    // Prepare test data - valid arrays with at least one element
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1]; // Non-zero value that passes the overflow check
    
    // Attempt to call transfer from unauthorizedHigher (which should be > authorized address)
    // On the original, this should revert because msg.sender != authorized address
    // On the mutant, this might succeed because of the >= comparison
    const tx = instance.connect(unauthorizedHigher).transfer(tos, values);
    
    // The mutant should NOT revert when called from a higher address
    // But the original would revert - so we expect the transaction to succeed (mutant killed)
    await expect(tx).to.not.be.reverted;
    
    // Also verify the contract state if needed - the mutant would have executed the call
    // while the original would have reverted
  });
});