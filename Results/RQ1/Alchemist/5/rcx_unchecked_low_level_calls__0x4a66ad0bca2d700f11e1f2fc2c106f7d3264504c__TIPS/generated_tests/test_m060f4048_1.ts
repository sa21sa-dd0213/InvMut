import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m060f4048", function () {
  it("should detect exponentiation mutant by passing v[i] > 1 and expecting revert due to overflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use authorized address (from address) to call transfer
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Setup test parameters
    const tos = [addr1.address];
    const amounts = [2]; // v[i] = 2, original: 2 * 1e18, mutant: 2 ** 1e18 (massive overflow)
    
    // Connect as authorized signer and call transfer
    const contractAsAuthorized = instance.connect(authorizedSigner);
    
    // The mutant with exponentiation will revert due to arithmetic overflow
    // Original would succeed with 2 * 1e18 = 2e18
    await expect(
      contractAsAuthorized.transfer(tos, amounts)
    ).to.be.reverted;
  });
});