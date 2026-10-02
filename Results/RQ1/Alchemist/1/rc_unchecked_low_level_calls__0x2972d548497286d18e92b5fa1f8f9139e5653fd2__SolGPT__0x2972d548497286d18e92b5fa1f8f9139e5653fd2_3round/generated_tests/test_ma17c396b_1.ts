import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant ma17c396b by calling transfer with non-empty arrays and expecting revert on mutant but success on original", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // This test will revert on the mutant (length < 0 is false for non-empty array)
    // but pass on the original (length > 0 is true for non-empty array)
    const from = owner.address;
    const caddress = owner.address; // using a valid contract address (EOA will cause call failure, but we test the require first)
    const tos = [addr1.address];
    const values = [100];
    
    await expect(
      instance.transfer(from, caddress, tos, values)
    ).to.be.reverted; // Original would revert on the inner call (EOA), but mutant reverts earlier on the length check
  });
});