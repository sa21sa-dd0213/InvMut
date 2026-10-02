import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m647389cf", function () {
  it("should kill mutant by calling transfer from an address with higher numeric value than the hardcoded address", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an address with a numerically higher value than the hardcoded from address
    // The hardcoded address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need an address > this value, e.g., 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6cA
    const higherAddress = ethers.getAddress("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6cA");

    // Prepare test inputs: array with one address and one value
    const tos = [attacker.address];
    const values = [1]; // 1 token

    // Call transfer from the higher address - should fail on original but succeed on mutant
    await expect(
      instance.connect(await ethers.getImpersonatedSigner(higherAddress)).transfer(tos, values)
    ).to.be.reverted;
  });
});