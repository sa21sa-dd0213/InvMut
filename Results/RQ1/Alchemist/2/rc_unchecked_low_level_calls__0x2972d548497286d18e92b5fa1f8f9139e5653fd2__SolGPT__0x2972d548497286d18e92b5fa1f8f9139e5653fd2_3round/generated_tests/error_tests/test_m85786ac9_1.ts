import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kill mutant that removes the require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test case: call transfer with empty _tos array
    // Original contract reverts due to require(_tos.length > 0)
    // Mutant without the require will not revert
    const from = addr1.address;
    const caddress = addr2.address;
    const emptyAddresses: string[] = [];
    const emptyValues: number[] = [];

    // Should revert on original, pass on mutant (kill the mutant by failing assertion)
    await expect(
      instance.transfer(from, caddress, emptyAddresses, emptyValues)
    ).to.be.revertedWith(""); // empty string matches any revert reason
  });
});