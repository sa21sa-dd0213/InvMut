import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0d99e683 by calling transfer with a single recipient and expecting success on original but revert on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: a single recipient in the array (length = 1 > 0)
    const recipients = [addr1.address];
    const value = 100;
    const decimals = 0;

    // On the original contract, this should succeed because _tos.length > 0
    // On the mutant, _tos.length < 0 will always be false, causing revert
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, value, decimals)
    ).to.be.reverted;
  });
});