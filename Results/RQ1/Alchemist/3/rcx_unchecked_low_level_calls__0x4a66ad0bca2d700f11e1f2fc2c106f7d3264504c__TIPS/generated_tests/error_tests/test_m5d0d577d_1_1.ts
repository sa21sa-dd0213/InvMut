import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m5d0d577d", function () {
  it("should kill mutant by calling transfer from address with higher numeric value than allowed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data
    const tos = [addr2.address];
    const values = [1]; // 1 token

    // Call transfer from an address that is numerically greater than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // The owner address 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 is numerically greater
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted; // Should revert because owner != 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
  });
});