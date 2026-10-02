import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kill mutant that removes require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Arrange: empty recipients array
    const emptyRecipients: string[] = [];
    const value = 100;
    const decimals = 18;

    // Act & Assert: original contract reverts on empty array, mutant would not
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        emptyRecipients,
        value,
        decimals
      )
    ).to.be.reverted;
  });
});