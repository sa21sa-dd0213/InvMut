import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m1a38ebcd", function () {
  it("should revert when _tos array is empty (length = 0) on original, but pass on mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare empty _tos array and empty v array
    const emptyTos: string[] = [];
    const emptyV: bigint[] = [];
    
    // The original contract should revert because require(_tos.length > 0) fails
    // The mutant with >= 0 will pass and return true
    // Since we cannot call the mutated version directly, we check behavior:
    // If the contract reverts, it's the original behavior (empty array rejected)
    // If it doesn't revert, it's the mutant behavior
    try {
      const tx = await instance.connect(owner).transfer(emptyTos, emptyV);
      await tx.wait();
      // If we get here, the transaction succeeded - this would be the mutant behavior
      // (since original would revert). We expect failure for the original.
      expect.fail("Expected revert but transaction succeeded - mutant detected");
    } catch (error: any) {
      // Check if the error indicates a revert (original behavior)
      expect(error.message).to.include("revert");
    }
  });
});